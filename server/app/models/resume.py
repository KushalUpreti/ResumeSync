from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ExperienceEntry(BaseModel):
    company: str
    role: str
    start_date: str | None = None
    end_date: str | None = None
    bullets: list[str] = Field(default_factory=list)


class ResumeDocument(BaseModel):
    resume_id: str = Field(default_factory=lambda: str(uuid4()))
    summary: str = ""
    experience: list[ExperienceEntry] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


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
