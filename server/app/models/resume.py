from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


def utcnow() -> datetime:
    return datetime.now(timezone.utc)

PLACEHOLDER_NAME = "Your Name"
PLACEHOLDER_EMAIL = "you@example.com"
PLACEHOLDER_PHONE = "(555) 555-5555"
PLACEHOLDER_LINKS = ["linkedin.com/in/your-profile"]


class ExperienceEntry(BaseModel):
    company: str
    role: str
    start_date: str | None = None
    end_date: str | None = None
    bullets: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_role_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict) and "role" not in data and "title" in data:
            normalized = dict(data)
            normalized["role"] = normalized["title"]
            return normalized
        return data

    @field_validator("company", "role", mode="before")
    @classmethod
    def none_to_empty_string(cls, value: Any) -> Any:
        return "" if value is None else value


class EducationEntry(BaseModel):
    institution: str
    degree: str
    field_of_study: str = ""
    start_date: str | None = None
    end_date: str | None = None
    gpa: str = ""
    description: str = ""

    @field_validator("institution", "degree", "field_of_study", "gpa", "description", mode="before")
    @classmethod
    def none_to_empty_string(cls, value: Any) -> Any:
        return "" if value is None else value


class ProjectEntry(BaseModel):
    name: str
    description: str = ""
    role: str | None = None
    technologies: list[str] = Field(default_factory=list)
    url: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    bullets: list[str] = Field(default_factory=list)

    @field_validator("name", "description", mode="before")
    @classmethod
    def none_to_empty_string(cls, value: Any) -> Any:
        return "" if value is None else value


class CertificationEntry(BaseModel):
    name: str
    issuer: str = ""
    date_obtained: str | None = None
    expiration_date: str | None = None
    url: str | None = None

    @field_validator("name", "issuer", mode="before")
    @classmethod
    def none_to_empty_string(cls, value: Any) -> Any:
        return "" if value is None else value


class SkillCategory(BaseModel):
    category: str
    items: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_skill_category(cls, data: Any) -> Any:
        if isinstance(data, str):
            skill = data.strip()
            return {"category": "Skills", "items": [skill] if skill else []}

        if isinstance(data, dict):
            normalized = dict(data)
            if "items" not in normalized and "skills" in normalized:
                normalized["items"] = normalized["skills"]
            if "category" not in normalized or not str(normalized["category"]).strip():
                normalized["category"] = "Skills"
            if isinstance(normalized.get("items"), str):
                normalized["items"] = [normalized["items"]]
            return normalized

        return data


class AiImprovement(BaseModel):
    category: str
    title: str
    description: str
    details: list[str] = Field(default_factory=list)
    evidence: str = ""

    @field_validator("category", "title", "description", "evidence", mode="before")
    @classmethod
    def none_to_empty_string(cls, value: Any) -> Any:
        return "" if value is None else value

    @field_validator("details", mode="before")
    @classmethod
    def normalize_details(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            cleaned = value.strip()
            return [cleaned] if cleaned else []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return []

    @field_validator("category", mode="after")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed = {
            "summary",
            "experience",
            "ats",
            "skills",
            "structure",
            "clarity",
            "keywords",
            "metrics",
            "projects",
            "education",
            "certifications",
            "formatting",
        }
        return normalized if normalized in allowed else "clarity"

    @model_validator(mode="after")
    def apply_detail_fallbacks(self) -> "AiImprovement":
        if not self.details and self.evidence.strip():
            self.details = [self.evidence.strip()]
        self.details = self.details[:3]
        return self


class ResumeDocument(BaseModel):
    resume_id: str = Field(default_factory=lambda: str(uuid4()))
    full_name: str = PLACEHOLDER_NAME
    email: str = PLACEHOLDER_EMAIL
    phone: str = PLACEHOLDER_PHONE
    links: list[str] = Field(default_factory=lambda: PLACEHOLDER_LINKS.copy())
    summary: str = ""
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    projects: list[ProjectEntry] = Field(default_factory=list)
    certifications: list[CertificationEntry] = Field(default_factory=list)
    skills: list[SkillCategory] = Field(default_factory=list)
    ai_improvements: list[AiImprovement] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_skills(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        skills = data.get("skills")
        if not isinstance(skills, list):
            return data

        flat_skills = [skill.strip() for skill in skills if isinstance(skill, str) and skill.strip()]
        if flat_skills and len(flat_skills) == len(skills):
            normalized = dict(data)
            normalized["skills"] = [{"category": "Skills", "items": flat_skills}]
            return normalized

        return data

    @model_validator(mode="after")
    def apply_contact_placeholders(self) -> "ResumeDocument":
        self.full_name = (self.full_name or "").strip() or PLACEHOLDER_NAME
        self.email = (self.email or "").strip() or PLACEHOLDER_EMAIL
        self.phone = (self.phone or "").strip() or PLACEHOLDER_PHONE
        cleaned_links = [link.strip() for link in (self.links or []) if link and link.strip()]
        self.links = cleaned_links or PLACEHOLDER_LINKS.copy()
        return self


class RewriteTarget(BaseModel):
    path: str
    instruction: str


class RewritePreviewRequest(BaseModel):
    text: str
    instruction: str
    mode: str = "polisher"


class RewritePreviewResponse(BaseModel):
    rewritten_text: str


class CommitResumeRequest(BaseModel):
    document: ResumeDocument


class RewriteResumeRequest(BaseModel):
    targets: list[RewriteTarget] = Field(default_factory=list)


class MasterResumeResponse(BaseModel):
    exists: bool
    document: ResumeDocument | None = None


class ResumeHistoryItem(BaseModel):
    resume_id: str
    json_key: str
    summary: str = ""
    display_name: str | None = None
    source_filename: str | None = None
    updated_at: datetime
    created_at: datetime


class ResumeHistoryResponse(BaseModel):
    items: list[ResumeHistoryItem] = Field(default_factory=list)
