from __future__ import annotations

import json
import io
import litellm
from typing import Any
from pypdf import PdfReader
from docx import Document
from app.models.resume import ResumeDocument, ExperienceEntry, RewriteTarget
from app.services.interfaces import ResumeParser, ResumeTailor

class LLMResumeParser(ResumeParser):
    def parse(self, source_bytes: bytes, filename: str = "", *, content_type: str | None = None, ai_provider: str | None = None, ai_model: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        raw_text = self._extract_text(source_bytes, filename, content_type)
        
        prompt = f"""Extract the professional experience, skills, summary, and employment dates from the following raw resume text and return it strictly as a JSON object matching this schema:
{{
  "summary": "A concise professional summary",
  "experience": [
    {{
      "company": "Company Name",
      "role": "Job Title",
      "start_date": "Exact date string if present, otherwise null",
      "end_date": "Exact date string if present, otherwise null",
      "bullets": ["Achievement bullet 1", "Achievement bullet 2"]
    }}
  ],
  "skills": ["Skill 1", "Skill 2"]
}}

Only output the JSON object. Do not include markdown formatting like ```json. Do not include any introductory or explanatory text.

If the source includes dates, preserve them exactly as they appear when possible. Do not invent dates.

RAW RESUME TEXT:
{raw_text}"""

        response = litellm.completion(
            model=self._get_model(ai_provider, ai_model),
            messages=[{"role": "user", "content": prompt}],
            api_key=ai_api_key,
            response_format={ "type": "json_object" } if ai_provider == "openai" else None
        )
        
        content = response.choices[0].message.content
        data = self._clean_json(content)
        
        return ResumeDocument(
            summary=data.get("summary", ""),
            experience=[ExperienceEntry(**exp) for exp in data.get("experience", [])],
            skills=data.get("skills", []),
            metadata={"source": filename, "parsed_by": "llm"}
        )

    def _extract_text(self, source_bytes: bytes, filename: str, content_type: str | None = None) -> str:
        lower_name = filename.lower()
        lower_type = (content_type or "").lower()

        if lower_name.endswith(".pdf") or lower_type == "application/pdf":
            reader = PdfReader(io.BytesIO(source_bytes))
            return "\n".join([page.extract_text() for page in reader.pages])
        elif lower_name.endswith(".docx") or lower_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            doc = Document(io.BytesIO(source_bytes))
            return "\n".join([p.text for p in doc.paragraphs])
        else:
            # Fallback for plain text
            return source_bytes.decode("utf-8", errors="ignore")

    def _get_model(self, provider: str | None, model: str | None = None) -> str:
        if model:
            return model
        if provider == "openai":
            return "gpt-4o"
        elif provider == "anthropic":
            return "claude-3-5-sonnet-20240620"
        return "gemini/gemini-1.5-pro" # Default to Gemini

    def _clean_json(self, content: str) -> dict:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        return json.loads(content.strip())

class LLMResumeTailor(ResumeTailor):
    def tailor(self, document: ResumeDocument, *, mode: str, context: dict[str, str | None], ai_provider: str | None = None, ai_model: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        prompt = self._build_prompt(document, mode=mode, context=context)

        response = litellm.completion(
            model=self._get_model(ai_provider, ai_model),
            messages=prompt,
            api_key=ai_api_key,
            response_format={ "type": "json_object" } if ai_provider == "openai" else None
        )
        
        data = self._clean_json(response.choices[0].message.content)
        
        return ResumeDocument(
            summary=data.get("summary", document.summary),
            experience=[ExperienceEntry(**exp) for exp in data.get("experience", [])],
            skills=data.get("skills", document.skills),
            metadata={**document.metadata, "mode": mode, "tailored": "true"}
        )

    def _build_prompt(self, document: ResumeDocument, *, mode: str, context: dict[str, str | None]) -> list[dict[str, str]]:
        role = (context.get("target_role") or "").strip()
        company = (context.get("target_company") or "").strip()
        job_desc = (context.get("job_description") or "").strip()
        source_notes = (context.get("source_notes") or "").strip()

        target_line = "the target role"
        if role and company:
            target_line = f"{role} at {company}"
        elif role:
            target_line = role
        elif company:
            target_line = f"a role at {company}"

        schema = """Return the updated resume strictly as a JSON object matching this schema:
{
  "summary": "...",
  "experience": [{"company": "...", "role": "...", "start_date": "...", "end_date": "...", "bullets": ["...", "..."]}],
  "skills": ["...", "..."]
}

Only output the JSON. Do not include markdown, explanations, or extra keys.
"""

        if mode == "sniper":
            system_prompt = (
                "You are an aggressive ATS resume strategist. "
                "Your job is to maximize relevance for the target role while staying truthful."
            )
            user_prompt = f"""Rewrite the resume for {target_line}.
Mode: sniper

Use the provided job description and source notes to prioritize the most relevant experience, verbs, and keywords.
Rules:
- Make the summary sharp, targeted, and outcome-oriented.
- Reorder and rewrite bullets to match the target role more aggressively.
- Surface skills that directly support the target role and job description.
- Keep the content truthful and grounded in the source material.
- Preserve start and end dates when they are already present in the source data.
- Do not invent dates or remove dates that were present in the original resume.
- If source notes add relevant context, weave them into the most appropriate experience section.
- Favor alignment and keyword density over broad generality.

{schema}

JOB DESCRIPTION:
{job_desc or "Not provided"}

SOURCE NOTES:
{source_notes or "Not provided"}

RESUME JSON:
{document.model_dump_json()}"""
        else:
            system_prompt = (
                "You are a careful resume editor who improves clarity, completeness, and professional tone. "
                "Your job is to preserve the candidate's broader story while making it stronger and cleaner."
            )
            user_prompt = f"""Rewrite the resume for {target_line}.
Mode: general

Use the provided notes as supporting context, but do not over-optimize or narrow the resume too much.
Rules:
- Keep the resume balanced and broadly applicable.
- Improve clarity, structure, and impact without making it feel overly targeted.
- Preserve a wide view of the candidate's experience and skills.
- Preserve start and end dates when they are already present in the source data.
- Do not invent dates or remove dates that were present in the original resume.
- If source notes add meaningful accomplishments or context, incorporate them naturally.
- Use the job description as guidance only when it clearly improves relevance.
- Avoid inventing details or stretching experience beyond what is supported.

{schema}

JOB DESCRIPTION:
{job_desc or "Not provided"}

SOURCE NOTES:
{source_notes or "Not provided"}

RESUME JSON:
{document.model_dump_json()}"""

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def rewrite_text(self, text: str, *, instruction: str, mode: str, ai_provider: str | None = None, ai_model: str | None = None, ai_api_key: str | None = None) -> str:
        prompt = f"Rewrite this text based on the instruction. Return ONLY the rewritten text, no quotes or explanation.\nInstruction: {instruction}\nText: {text}"
        
        response = litellm.completion(
            model=self._get_model(ai_provider, ai_model),
            messages=[{"role": "user", "content": prompt}],
            api_key=ai_api_key
        )
        return response.choices[0].message.content.strip()

    def apply_rewrites(self, document: ResumeDocument, targets: list[RewriteTarget], ai_provider: str | None = None, ai_model: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        # For now, we can iterate or do it in one shot. One shot is safer for JSON consistency.
        # But interfaces define it as applying targets.
        updated = document.model_copy(deep=True)
        for target in targets:
             # This is a bit inefficient for LLM calls, but matches the interface.
             # In a production app, we'd batch these.
             if target.path == "summary":
                 updated.summary = self.rewrite_text(updated.summary, instruction=target.instruction, mode="polisher", ai_provider=ai_provider, ai_model=ai_model, ai_api_key=ai_api_key)
             # ... handle experience paths if needed
        return updated

    def _get_model(self, provider: str | None, model: str | None = None) -> str:
        if model:
            return model
        if provider == "openai":
            return "gpt-4o"
        elif provider == "anthropic":
            return "claude-3-5-sonnet-20240620"
        return "gemini/gemini-1.5-pro"

    def _clean_json(self, content: str) -> dict:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        return json.loads(content.strip())
