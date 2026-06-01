from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator


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


class EducationEntry(BaseModel):
    institution: str
    degree: str
    field_of_study: str = ""
    start_date: str | None = None
    end_date: str | None = None
    gpa: str = ""
    description: str = ""


class ResumeDocument(BaseModel):
    resume_id: str = Field(default_factory=lambda: str(uuid4()))
    full_name: str = PLACEHOLDER_NAME
    email: str = PLACEHOLDER_EMAIL
    phone: str = PLACEHOLDER_PHONE
    links: list[str] = Field(default_factory=lambda: PLACEHOLDER_LINKS.copy())
    summary: str = ""
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

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
    updated_at: datetime
    created_at: datetime


class ResumeHistoryResponse(BaseModel):
    items: list[ResumeHistoryItem] = Field(default_factory=list)
