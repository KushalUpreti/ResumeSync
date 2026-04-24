from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

from app.models.resume import ResumeDocument, RewriteTarget

JobType = Literal["generate", "rewrite", "render", "parse_master", "commit"]
ResumeMode = Literal["polisher", "sniper"]
SourceType = Literal["new_upload", "master", "previous"]
JobStatus = Literal["pending", "processing", "complete", "failed"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class JobState(BaseModel):
    job_id: str
    status: JobStatus
    output_s3_key: str | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class GenerateJobPayload(BaseModel):
    job_type: Literal["generate"] = "generate"
    mode: ResumeMode
    source_type: SourceType
    source_json_key: str | None = None
    input_s3_key: str | None = None
    output_json_key: str
    template_id: str
    user_id: str | None = None
    session_id: str | None = None
    target_role: str | None = None
    target_company: str | None = None
    job_description: str | None = None

    @model_validator(mode="after")
    def validate_source_fields(self) -> "GenerateJobPayload":
        if self.source_type == "new_upload" and not self.input_s3_key:
            raise ValueError("input_s3_key is required for new_upload jobs")
        if self.source_type == "previous" and not self.source_json_key:
            raise ValueError("source_json_key is required for previous jobs")
        return self


class RewriteJobPayload(BaseModel):
    job_type: Literal["rewrite"] = "rewrite"
    resume_id: str
    resume_json_key: str
    user_id: str
    targets: list[RewriteTarget] = Field(default_factory=list)


class RenderJobPayload(BaseModel):
    job_type: Literal["render"] = "render"
    resume_id: str
    resume_json_key: str
    template_id: str
    user_id: str


class ParseMasterJobPayload(BaseModel):
    job_type: Literal["parse_master"] = "parse_master"
    user_id: str
    input_s3_key: str


class CommitJobPayload(BaseModel):
    job_type: Literal["commit"] = "commit"
    resume_id: str
    resume_json_key: str
    user_id: str
    document: ResumeDocument


JobPayload = GenerateJobPayload | RewriteJobPayload | RenderJobPayload | ParseMasterJobPayload | CommitJobPayload


class JobEnvelope(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid4()))
    payload: JobPayload = Field(discriminator="job_type")


class QueuedJob(BaseModel):
    envelope: JobEnvelope
    receipt_handle: str | None = None


class CreateGenerateJobRequest(BaseModel):
    job_type: Literal["generate"] = "generate"
    mode: ResumeMode
    source_type: SourceType
    template_id: str
    source_json_key: str | None = None
    input_s3_key: str | None = None
    target_role: str | None = None
    target_company: str | None = None
    job_description: str | None = None


class CreateJobResponse(BaseModel):
    job_id: str
    status: JobStatus


class UploadUrlRequest(BaseModel):
    upload_type: Literal["resume_source", "master_resume"] = "resume_source"
    filename: str
    content_type: str = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class UploadUrlResponse(BaseModel):
    upload_url: str
    object_key: str
    method: str = "PUT"
    headers: dict[str, str] = Field(default_factory=dict)


class RenderResumeRequest(BaseModel):
    template_id: str


class MasterResumeUploadRequest(BaseModel):
    input_s3_key: str
