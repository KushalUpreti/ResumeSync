from __future__ import annotations

import json
import re
from pathlib import Path

from app.core.exceptions import NotFoundError
from app.domain.storage_keys import job_state_key
from app.models.jobs import JobEnvelope, JobState, QueuedJob
from app.models.resume import ExperienceEntry, ResumeDocument, RewriteTarget, SkillCategory
from app.services.interfaces import DocumentRenderer, JobStateStore, ObjectStore, PresignedUpload, QueueService, ResumeParser, ResumeTailor


class LocalObjectStore(ObjectStore):
    def __init__(self, root: Path) -> None:
        self.root = root / "object_store"
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, object_key: str) -> Path:
        path = (self.root / object_key).resolve()
        try:
            path.relative_to(self.root.resolve())
        except ValueError as exc:
            raise ValueError("Object key escapes the local object store root") from exc
        return path

    def create_presigned_upload(self, object_key: str, content_type: str) -> PresignedUpload:
        return PresignedUpload(
            upload_url=f"local://{object_key}",
            object_key=object_key,
            headers={"content-type": content_type},
        )

    def put_json(self, object_key: str, data: dict) -> None:
        path = self._path(object_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

    def get_json(self, object_key: str) -> dict:
        path = self._path(object_key)
        if not path.exists():
            raise NotFoundError(f"Object not found: {object_key}")
        return json.loads(path.read_text(encoding="utf-8"))

    def put_bytes(self, object_key: str, content: bytes) -> None:
        path = self._path(object_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def get_bytes(self, object_key: str) -> bytes:
        path = self._path(object_key)
        if not path.exists():
            raise NotFoundError(f"Object not found: {object_key}")
        return path.read_bytes()

    def exists(self, object_key: str) -> bool:
        return self._path(object_key).exists()

    def delete(self, object_key: str) -> None:
        path = self._path(object_key)
        if path.exists():
            path.unlink()

    def list_keys(self, prefix: str) -> list[str]:
        prefix_path = self._path(prefix)
        if not prefix_path.exists():
            return []
        keys: list[str] = []
        for path in prefix_path.rglob("*"):
            if path.is_file():
                keys.append(str(path.relative_to(self.root)).replace("\\", "/"))
        return sorted(keys)


class LocalQueueService(QueueService):
    def __init__(self, root: Path) -> None:
        self.root = root / "queue"
        self.root.mkdir(parents=True, exist_ok=True)

    def send(self, envelope: JobEnvelope) -> None:
        queue_file = self.root / f"{envelope.job_id}.json"
        queue_file.write_text(envelope.model_dump_json(indent=2), encoding="utf-8")

    def receive(self, max_messages: int = 1) -> list[QueuedJob]:
        messages: list[QueuedJob] = []
        for queue_file in sorted(self.root.glob("*.json"))[:max_messages]:
            envelope = JobEnvelope.model_validate_json(queue_file.read_text(encoding="utf-8"))
            messages.append(QueuedJob(envelope=envelope, receipt_handle=queue_file.stem))
        return messages

    def acknowledge(self, job: QueuedJob) -> None:
        queue_file = self.root / f"{job.envelope.job_id}.json"
        if queue_file.exists():
            queue_file.unlink()


class S3BackedJobStateStore(JobStateStore):
    def __init__(self, object_store: ObjectStore) -> None:
        self.object_store = object_store

    def create(self, state: JobState) -> None:
        self.save(state)

    def get(self, job_id: str) -> JobState:
        return JobState.model_validate(self.object_store.get_json(job_state_key(job_id)))

    def save(self, state: JobState) -> None:
        self.object_store.put_json(job_state_key(state.job_id), state.model_dump(mode="json"))


class LocalResumeParser(ResumeParser):
    def parse(self, source_bytes: bytes, filename: str = "", *, content_type: str | None = None, ai_provider: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        text = source_bytes.decode("utf-8", errors="ignore").strip()
        if not text:
            raise ValueError("The provided document or notes is empty. Please provide some professional details to proceed.")
        
        # Check if they just wrote "hello" or something useless (very short text)
        if len(text) < 15:
            raise ValueError(
                "The provided information is insufficient to generate a resume. "
                "Please upload a detailed resume or write more description in the notes."
            )
            
        summary = text.splitlines()[0] if text else "Imported resume"
        bullets = [line.strip("- ").strip() for line in text.splitlines()[1:4] if line.strip()]
        start_date, end_date = self._extract_date_range(text)
        return ResumeDocument(
            full_name="Imported Candidate",
            email="candidate@example.com",
            phone="(555) 555-5555",
            links=["linkedin.com/in/candidate"],
            summary=summary,
            experience=[
                ExperienceEntry(
                    company="Imported Company",
                    role="Imported Role",
                    start_date=start_date,
                    end_date=end_date,
                    bullets=bullets or ["Review imported content and replace with parsed experience bullets."],
                )
            ],
            skills=[SkillCategory(category="Skills", items=["Communication", "Execution"])],
            metadata={"source": filename or "local_parser"},
        )

    def _extract_date_range(self, text: str) -> tuple[str | None, str | None]:
        patterns = [
            re.compile(
                r"(?P<start>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*(?:-|–|—|to)\s*(?P<end>(?:Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}))",
                re.IGNORECASE,
            ),
            re.compile(
                r"(?P<start>\d{1,2}/\d{4})\s*(?:-|–|—|to)\s*(?P<end>(?:Present|Current|Now|\d{1,2}/\d{4}))",
                re.IGNORECASE,
            ),
        ]

        for pattern in patterns:
            match = pattern.search(text)
            if match:
                return match.group("start"), match.group("end")

        return None, None


class LocalResumeTailor(ResumeTailor):
    def tailor(self, document: ResumeDocument, *, mode: str, context: dict[str, str | None], ai_provider: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        updated = document.model_copy(deep=True)
        mode_prefix = "Elite" if mode == "sniper" else "Polished"
        role = context.get("target_role") or "target role"
        company = context.get("target_company") or "target company"
        updated.summary = f"{mode_prefix} summary tailored for {role} at {company}. {document.summary}".strip()
        if updated.skills:
            updated.skills[0].items = sorted(
                set(updated.skills[0].items + ["ATS Optimization", "Stakeholder Management"])
            )
        else:
            updated.skills = [
                SkillCategory(category="Skills", items=["ATS Optimization", "Stakeholder Management"])
            ]
        updated.metadata |= {k: v for k, v in context.items() if v}
        return updated

    def rewrite_text(self, text: str, *, instruction: str, mode: str, ai_provider: str | None = None, ai_api_key: str | None = None) -> str:
        prefix = "Sniper rewrite" if mode == "sniper" else "Polisher rewrite"
        return f"{prefix}: {instruction}. {text}".strip()

    def apply_rewrites(self, document: ResumeDocument, targets: list[RewriteTarget], ai_provider: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        updated = document.model_copy(deep=True)
        for target in targets:
            if target.path.startswith("summary"):
                updated.summary = self.rewrite_text(updated.summary, instruction=target.instruction, mode="polisher")
                continue
            if target.path.startswith("experience["):
                try:
                    exp_index = int(target.path.split("[", 1)[1].split("]", 1)[0])
                    bullet_index = int(target.path.rsplit("[", 1)[1].split("]", 1)[0])
                    bullet = updated.experience[exp_index].bullets[bullet_index]
                    updated.experience[exp_index].bullets[bullet_index] = self.rewrite_text(
                        bullet,
                        instruction=target.instruction,
                        mode="polisher",
                    )
                except (IndexError, ValueError):
                    continue
        return updated


class LocalDocumentRenderer(DocumentRenderer):
    def render(self, document: ResumeDocument, *, template_id: str) -> bytes:
        lines = [
            f"Template: {template_id}",
            f"Resume ID: {document.resume_id}",
            f"Summary: {document.summary}",
            "Skills: "
            + ", ".join(skill for category in document.skills for skill in category.items),
        ]
        for entry in document.experience:
            lines.append(f"{entry.role} @ {entry.company}")
            lines.extend(f"- {bullet}" for bullet in entry.bullets)
        return "\n".join(lines).encode("utf-8")
