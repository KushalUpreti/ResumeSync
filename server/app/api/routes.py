from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.api.deps import get_services, get_user_context
from app.core.exceptions import NotFoundError
from app.domain.storage_keys import master_resume_key, resume_json_key, temp_upload_key
from app.models.auth import UserContext
from app.models.jobs import (
    CommitJobPayload,
    CreateGenerateJobRequest,
    CreateJobResponse,
    GenerateJobPayload,
    JobEnvelope,
    JobState,
    MasterResumeUploadRequest,
    ParseMasterJobPayload,
    RenderResumeRequest,
    RenderJobPayload,
    RewriteJobPayload,
    UploadUrlRequest,
    UploadUrlResponse,
)
from app.models.resume import CommitResumeRequest, MasterResumeResponse, RewritePreviewRequest, RewritePreviewResponse, RewriteResumeRequest
from app.services.container import ServiceContainer

router = APIRouter()


@router.post("/upload-url", response_model=UploadUrlResponse)
def create_upload_url(
    request: UploadUrlRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> UploadUrlResponse:
    session_id = user.session_id or user.user_id or str(uuid4())
    suffix = Path(request.filename).suffix or ".docx"
    object_key = temp_upload_key(session_id, f"{uuid4()}{suffix}")
    upload = services.object_store.create_presigned_upload(object_key, request.content_type)
    return UploadUrlResponse(
        upload_url=upload.upload_url,
        object_key=upload.object_key,
        method=upload.method,
        headers=upload.headers or {},
    )


@router.post("/jobs", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_generate_job(
    request: CreateGenerateJobRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    actor_id = user.user_id or user.session_id
    if not actor_id:
        raise HTTPException(status_code=400, detail="A user or session identity is required")

    new_resume_id = str(uuid4())
    payload = GenerateJobPayload(
        mode=request.mode,
        source_type=request.source_type,
        source_json_key=request.source_json_key,
        input_s3_key=request.input_s3_key,
        output_json_key=resume_json_key(user.actor_id, new_resume_id),
        template_id=request.template_id,
        user_id=user.user_id,
        session_id=user.session_id,
        target_role=request.target_role,
        target_company=request.target_company,
        job_description=request.job_description,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending")
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/jobs/{job_id}", response_model=JobState)
def get_job(job_id: str, services: ServiceContainer = Depends(get_services)) -> JobState:
    try:
        return services.job_states.get(job_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/rewrite/preview", response_model=RewritePreviewResponse)
def rewrite_preview(
    request: RewritePreviewRequest,
    services: ServiceContainer = Depends(get_services),
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> RewritePreviewResponse:
    rewritten = services.tailor.rewrite_text(
        request.text,
        instruction=request.instruction,
        mode=request.mode,
        ai_provider=x_ai_provider,
        ai_api_key=x_ai_api_key,
    )
    return RewritePreviewResponse(rewritten_text=rewritten)


@router.post("/resume/{resume_id}/commit", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def commit_resume(
    resume_id: str,
    request: CommitResumeRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> CreateJobResponse:
    if not user.user_id:
        raise HTTPException(status_code=400, detail="Authenticated user_id is required for commit")

    payload = CommitJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(user.user_id, resume_id),
        user_id=user.user_id,
        document=request.document.model_copy(update={"resume_id": resume_id}),
    )
    envelope = JobEnvelope(payload=payload)
    state = JobState(job_id=envelope.job_id, status="pending")
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.post("/resume/{resume_id}/render", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def render_resume(
    resume_id: str,
    request: RenderResumeRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> CreateJobResponse:
    if not user.user_id:
        raise HTTPException(status_code=400, detail="Authenticated user_id is required for render")

    payload = RenderJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(user.user_id, resume_id),
        template_id=request.template_id,
        user_id=user.user_id,
    )
    envelope = JobEnvelope(payload=payload)
    state = JobState(job_id=envelope.job_id, status="pending")
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.post("/resume/{resume_id}/rewrite", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def rewrite_resume(
    resume_id: str,
    request: RewriteResumeRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    if not user.user_id:
        raise HTTPException(status_code=400, detail="Authenticated user_id is required for rewrite")

    payload = RewriteJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(user.user_id, resume_id),
        user_id=user.user_id,
        targets=request.targets,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending")
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.post("/master-resume", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_master_resume(
    request: MasterResumeUploadRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    if not user.user_id:
        raise HTTPException(status_code=400, detail="Authenticated user_id is required for master resume")

    payload = ParseMasterJobPayload(
        user_id=user.user_id,
        input_s3_key=request.input_s3_key,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending")
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/master-resume", response_model=MasterResumeResponse)
def get_master_resume(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> MasterResumeResponse:
    if not user.user_id:
        raise HTTPException(status_code=400, detail="Authenticated user_id is required for master resume")

    key = master_resume_key(user.user_id)
    if not services.object_store.exists(key):
        return MasterResumeResponse(exists=False)
    document = services.object_store.get_json(key)
    return MasterResumeResponse(exists=True, document=document)
