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
    def parse(self, source_bytes: bytes, filename: str = "", *, ai_provider: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        raw_text = self._extract_text(source_bytes, filename)
        
        prompt = f"""Extract the professional experience, skills, and summary from the following raw resume text and return it strictly as a JSON object matching this schema:
{{
  "summary": "A concise professional summary",
  "experience": [
    {{
      "company": "Company Name",
      "role": "Job Title",
      "bullets": ["Achievement bullet 1", "Achievement bullet 2"]
    }}
  ],
  "skills": ["Skill 1", "Skill 2"]
}}

Only output the JSON object. Do not include markdown formatting like ```json. Do not include any introductory or explanatory text.

RAW RESUME TEXT:
{raw_text}"""

        response = litellm.completion(
            model=self._get_model(ai_provider),
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

    def _extract_text(self, source_bytes: bytes, filename: str) -> str:
        if filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(source_bytes))
            return "\n".join([page.extract_text() for page in reader.pages])
        elif filename.lower().endswith(".docx"):
            doc = Document(io.BytesIO(source_bytes))
            return "\n".join([p.text for p in doc.paragraphs])
        else:
            # Fallback for plain text
            return source_bytes.decode("utf-8", errors="ignore")

    def _get_model(self, provider: str | None) -> str:
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
    def tailor(self, document: ResumeDocument, *, mode: str, context: dict[str, str | None], ai_provider: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        job_desc = context.get("job_description", "")
        role = context.get("target_role", "")
        company = context.get("target_company", "")
        
        system_prompt = "You are an expert resume writer and ATS optimization specialist."
        user_prompt = f"""Rewrite the following resume to better align with the job description for a {role} at {company}.
Mode: {mode} (polisher = subtle improvements, sniper = aggressive alignment)

Return the updated resume strictly as a JSON object matching this schema:
{{
  "summary": "...",
  "experience": [{{"company": "...", "role": "...", "bullets": ["...", "..."]}}],
  "skills": ["...", "..."]
}}

Only output the JSON.

JOB DESCRIPTION:
{job_desc}

RESUME JSON:
{document.model_dump_json()}"""

        response = litellm.completion(
            model=self._get_model(ai_provider),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
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

    def rewrite_text(self, text: str, *, instruction: str, mode: str, ai_provider: str | None = None, ai_api_key: str | None = None) -> str:
        prompt = f"Rewrite this text based on the instruction. Return ONLY the rewritten text, no quotes or explanation.\nInstruction: {instruction}\nText: {text}"
        
        response = litellm.completion(
            model=self._get_model(ai_provider),
            messages=[{"role": "user", "content": prompt}],
            api_key=ai_api_key
        )
        return response.choices[0].message.content.strip()

    def apply_rewrites(self, document: ResumeDocument, targets: list[RewriteTarget], ai_provider: str | None = None, ai_api_key: str | None = None) -> ResumeDocument:
        # For now, we can iterate or do it in one shot. One shot is safer for JSON consistency.
        # But interfaces define it as applying targets.
        updated = document.model_copy(deep=True)
        for target in targets:
             # This is a bit inefficient for LLM calls, but matches the interface.
             # In a production app, we'd batch these.
             if target.path == "summary":
                 updated.summary = self.rewrite_text(updated.summary, instruction=target.instruction, mode="polisher", ai_provider=ai_provider, ai_api_key=ai_api_key)
             # ... handle experience paths if needed
        return updated

    def _get_model(self, provider: str | None) -> str:
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
