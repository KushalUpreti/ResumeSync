from __future__ import annotations

from datetime import datetime, timezone
from app.core.exceptions import InvalidStateError
from app.domain.storage_keys import master_resume_key, output_docx_key
from app.models.jobs import CommitJobPayload, GenerateJobPayload, JobEnvelope, JobState, ParseMasterJobPayload, RenderJobPayload, RewriteJobPayload
from app.models.resume import ResumeDocument
from app.services.container import ServiceContainer


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class JobProcessor:
    def __init__(self, services: ServiceContainer) -> None:
        self.services = services

    def process(self, envelope: JobEnvelope) -> bool:
        state = self.services.job_states.get(envelope.job_id)
        state.status = "processing"
        state.updated_at = utcnow()
        self.services.job_states.save(state)

        success = False
        try:
            output_key = self._dispatch(envelope)
            state.status = "complete"
            state.output_s3_key = output_key
            state.error = None
            success = True
        except Exception as exc:
            state.status = "failed"
            state.error = str(exc)
        finally:
            state.updated_at = utcnow()
            self.services.job_states.save(state)

        return success

    def _dispatch(self, envelope: JobEnvelope) -> str | None:
        payload = envelope.payload
        ai_provider = envelope.ai_provider
        ai_model = envelope.ai_model
        ai_api_key = envelope.ai_api_key
        
        if isinstance(payload, GenerateJobPayload):
            return self._handle_generate(payload, ai_provider, ai_model, ai_api_key)
        if isinstance(payload, ParseMasterJobPayload):
            return self._handle_parse_master(payload, ai_provider, ai_model, ai_api_key)
        if isinstance(payload, CommitJobPayload):
            return self._handle_commit(payload)
        if isinstance(payload, RenderJobPayload):
            return self._handle_render(payload)
        if isinstance(payload, RewriteJobPayload):
            return self._handle_rewrite(payload, ai_provider, ai_model, ai_api_key)
        raise InvalidStateError(f"Unsupported job type: {payload.job_type}")

    def _handle_generate(self, payload: GenerateJobPayload, ai_provider: str | None, ai_model: str | None, ai_api_key: str | None) -> str:
        base_document = self._load_generate_source(payload, ai_provider, ai_model, ai_api_key)
        tailored = self.services.tailor.tailor(
            base_document,
            mode=payload.mode,
            context={
                "target_role": payload.target_role,
                "target_company": payload.target_company,
                "job_description": payload.job_description,
                "template_id": payload.template_id,
            },
            ai_provider=ai_provider,
            ai_model=ai_model,
            ai_api_key=ai_api_key,
        )
        self.services.object_store.put_json(payload.output_json_key, tailored.model_dump(mode="json"))
        return payload.output_json_key

    def _get_actor(self, payload: Any) -> tuple[str, bool]:
        if getattr(payload, "user_id", None):
            return payload.user_id, False
        if getattr(payload, "session_id", None):
            return payload.session_id, True
        raise InvalidStateError("Payload must have user_id or session_id")

    def _load_generate_source(self, payload: GenerateJobPayload, ai_provider: str | None, ai_model: str | None, ai_api_key: str | None) -> ResumeDocument:
        if payload.source_type == "new_upload":
            if not payload.input_s3_key:
                raise InvalidStateError("New upload jobs require input_s3_key")
            source_bytes = self.services.object_store.get_bytes(payload.input_s3_key)
            document = self.services.parser.parse(source_bytes, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=ai_api_key)
            self.services.object_store.delete(payload.input_s3_key)
            return document

        if payload.source_type == "master":
            actor_id, is_session = self._get_actor(payload)
            document_json = self.services.object_store.get_json(master_resume_key(actor_id, is_session))
            return ResumeDocument.model_validate(document_json)

        if payload.source_type == "previous":
            if not payload.source_json_key:
                raise InvalidStateError("Previous resume jobs require source_json_key")
            document_json = self.services.object_store.get_json(payload.source_json_key)
            return ResumeDocument.model_validate(document_json)

        raise InvalidStateError(f"Unknown source_type: {payload.source_type}")

    def _handle_parse_master(self, payload: ParseMasterJobPayload, ai_provider: str | None, ai_model: str | None, ai_api_key: str | None) -> str:
        source_bytes = self.services.object_store.get_bytes(payload.input_s3_key)
        document = self.services.parser.parse(
            source_bytes,
            filename=payload.filename,
            content_type=payload.content_type,
            ai_provider=ai_provider,
            ai_model=ai_model,
            ai_api_key=ai_api_key,
        )
        actor_id, is_session = self._get_actor(payload)
        key = master_resume_key(actor_id, is_session)
        self.services.object_store.put_json(key, document.model_dump(mode="json"))
        self.services.object_store.delete(payload.input_s3_key)
        return key

    def _handle_commit(self, payload: CommitJobPayload) -> str:
        document = payload.document.model_copy(update={"updated_at": utcnow()})
        self.services.object_store.put_json(payload.resume_json_key, document.model_dump(mode="json"))
        return payload.resume_json_key

    def _handle_render(self, payload: RenderJobPayload) -> str:
        document_json = self.services.object_store.get_json(payload.resume_json_key)
        document = ResumeDocument.model_validate(document_json)
        rendered = self.services.renderer.render(document, template_id=payload.template_id)
        actor_id, is_session = self._get_actor(payload)
        output_key = output_docx_key(actor_id, payload.resume_id, is_session)
        self.services.object_store.put_bytes(output_key, rendered)
        return output_key

    def _handle_rewrite(self, payload: RewriteJobPayload, ai_provider: str | None, ai_model: str | None, ai_api_key: str | None) -> str:
        document_json = self.services.object_store.get_json(payload.resume_json_key)
        document = ResumeDocument.model_validate(document_json)
        updated = self.services.tailor.apply_rewrites(document, payload.targets, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=ai_api_key)
        self.services.object_store.put_json(payload.resume_json_key, updated.model_dump(mode="json"))
        return payload.resume_json_key
