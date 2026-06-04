from __future__ import annotations

from io import BytesIO
from pathlib import Path
from uuid import uuid4

import litellm
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from fastapi.responses import FileResponse, StreamingResponse

from app.api.deps import get_services, get_user_context
from app.core.exceptions import NotFoundError
from app.domain.storage_keys import master_resume_key, output_docx_key, resume_json_key, temp_upload_key
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
    ValidateAiKeyResponse,
)
from app.models.resume import CommitResumeRequest, MasterResumeResponse, ResumeDocument, ResumeHistoryItem, ResumeHistoryResponse, RewritePreviewRequest, RewritePreviewResponse, RewriteResumeRequest
from app.services.container import ServiceContainer

router = APIRouter()

INTERNAL_SOURCE_FILENAMES = {"notes_ingestion", "notes_ingestion.txt"}


def _public_source_filename(raw_source: str | None) -> str | None:
    if not raw_source or not raw_source.strip():
        return None

    source_filename = Path(raw_source).name
    if (
        source_filename.lower() in INTERNAL_SOURCE_FILENAMES
        or Path(source_filename).stem.lower() in INTERNAL_SOURCE_FILENAMES
    ):
        return None

    return source_filename


def _metadata_display_name(metadata: dict | None) -> str | None:
    if not isinstance(metadata, dict):
        return None

    raw_name = metadata.get("download_name") or metadata.get("file_name")
    if not isinstance(raw_name, str) or not raw_name.strip():
        return None

    return raw_name.removesuffix(".docx").strip()


def _normalize_provider(provider: str | None) -> str:
    raw = (provider or "").strip().lower()
    if raw in {"google", "gemini"}:
        return "gemini"
    if raw in {"openai", "anthropic"}:
        return raw
    return raw


def _resolve_validation_model(provider: str) -> str:
    if provider == "openai":
        return "openai/gpt-4o-mini"
    if provider == "anthropic":
        return "anthropic/claude-3-5-haiku-20241022"
    if provider == "gemini":
        return "gemini/gemini-2.5-flash"
    return "gemini/gemini-2.5-flash"


def _validate_ai_credentials_or_400(x_ai_provider: str | None, x_ai_model: str | None, x_ai_api_key: str | None) -> tuple[str, str]:
    provider = _normalize_provider(x_ai_provider)
    api_key = (x_ai_api_key or "").strip()
    if not provider:
        raise HTTPException(status_code=400, detail="Missing X-AI-Provider header.")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing X-AI-API-Key header.")
    model = _resolve_validation_model(provider)
    try:
        litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": "Respond with exactly: ok"}],
            max_tokens=3,
            timeout=15,
        )
    except Exception as exc:
        message = str(exc)
        status_code = 401
        if "rate limit" in message.lower() or "429" in message:
            status_code = 429
        elif "timeout" in message.lower():
            status_code = 503
        raise HTTPException(status_code=status_code, detail=f"AI credential validation failed for provider '{provider}': {message}") from exc
    return provider, model


@router.post("/ai/validate-key", response_model=ValidateAiKeyResponse)
def validate_ai_key(
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> ValidateAiKeyResponse:
    provider, model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    return ValidateAiKeyResponse(valid=True, provider=provider, model=model)


@router.post("/upload-url", response_model=UploadUrlResponse)
def create_upload_url(
    request: UploadUrlRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> UploadUrlResponse:
    _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)
    actor_prefix = f"{'temp' if is_session else 'users'}/{actor_id}/json/"

    output_json_key: str
    if request.source_type == "previous":
        if not request.source_json_key:
            raise HTTPException(status_code=400, detail="source_json_key is required for previous source jobs.")
        if not request.source_json_key.startswith(actor_prefix):
            raise HTTPException(status_code=403, detail="Invalid source_json_key for this user.")
        output_json_key = request.source_json_key
    else:
        new_resume_id = str(uuid4())
        output_json_key = resume_json_key(actor_id, new_resume_id, is_session)

    payload = GenerateJobPayload(
        mode=request.mode,
        source_type=request.source_type,
        source_json_key=request.source_json_key,
        input_s3_key=request.input_s3_key,
        source_notes=request.source_notes,
        output_json_key=output_json_key,
        template_id=request.template_id,
        user_id=user.user_id,
        session_id=user.session_id,
        target_role=request.target_role,
        target_company=request.target_company,
        job_description=request.job_description,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_model=x_ai_model, ai_api_key=x_ai_api_key)
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> RewritePreviewResponse:
    rewritten = services.tailor.rewrite_text(
        request.text,
        instruction=request.instruction,
        mode=request.mode,
        ai_provider=x_ai_provider,
        ai_model=x_ai_model,
        ai_api_key=x_ai_api_key,
    )
    return RewritePreviewResponse(rewritten_text=rewritten)


@router.get("/resume/{resume_id}", response_model=ResumeDocument)
def get_resume(
    resume_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> ResumeDocument:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    key = resume_json_key(actor_id, resume_id, is_session)
    if not services.object_store.exists(key):
        raise HTTPException(status_code=404, detail="Resume JSON not found.")

    document_data = services.object_store.get_json(key)
    return ResumeDocument.model_validate(document_data)


@router.delete("/resume/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> Response:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    json_key = resume_json_key(actor_id, resume_id, is_session)
    if not services.object_store.exists(json_key):
        raise HTTPException(status_code=404, detail="Resume not found.")

    services.object_store.delete(json_key)

    rendered_key = output_docx_key(actor_id, resume_id, is_session)
    if services.object_store.exists(rendered_key):
        services.object_store.delete(rendered_key)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/resume-by-key", response_model=ResumeDocument)
def get_resume_by_key(
    json_key: str = Query(..., description="Exact storage key for the resume JSON document."),
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> ResumeDocument:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)
    expected_prefix = f"{'temp' if is_session else 'users'}/{actor_id}/json/"

    if not json_key.startswith(expected_prefix):
        raise HTTPException(status_code=403, detail="Invalid resume key for this user.")
    if not services.object_store.exists(json_key):
        raise HTTPException(status_code=404, detail="Resume JSON not found.")

    document_data = services.object_store.get_json(json_key)
    return ResumeDocument.model_validate(document_data)


@router.get("/resume/{resume_id}/download")
def download_rendered_resume(
    resume_id: str,
    template_id: str = Query(default="modern", description="Template name, e.g. 'modern', 'executive', 'professional'"),
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> StreamingResponse:
    """Render the resume with the chosen template and stream the .docx back for download."""
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    key = resume_json_key(actor_id, resume_id, is_session)
    if not services.object_store.exists(key):
        raise HTTPException(status_code=404, detail="Resume not found.")

    document_data = services.object_store.get_json(key)
    document = ResumeDocument.model_validate(document_data)

    # Render synchronously — DocxtplDocumentRenderer fills the template with resume data
    safe_template = Path(template_id).name  # prevent path traversal
    try:
        rendered_bytes = services.renderer.render(document, template_id=safe_template)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate the selected resume template right now. Please try again.",
        ) from exc

    filename = f"resume_{safe_template}.docx"
    return StreamingResponse(
        BytesIO(rendered_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/resume/{resume_id}/commit", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def commit_resume(
    resume_id: str,
    request: CommitResumeRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> CreateJobResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = CommitJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
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
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = RenderJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        template_id=request.template_id,
        user_id=user.user_id,
        session_id=user.session_id,
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = RewriteJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
        targets=request.targets,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_model=x_ai_model, ai_api_key=x_ai_api_key)
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = ParseMasterJobPayload(
        user_id=user.user_id,
        session_id=user.session_id,
        input_s3_key=request.input_s3_key,
        filename=request.filename,
        content_type=request.content_type,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_model=x_ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending")
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/master-resume", response_model=MasterResumeResponse)
def get_master_resume(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> MasterResumeResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    key = master_resume_key(actor_id, is_session)
    if not services.object_store.exists(key):
        return MasterResumeResponse(exists=False)
    document = services.object_store.get_json(key)
    return MasterResumeResponse(exists=True, document=document)


@router.delete("/master-resume", status_code=status.HTTP_204_NO_CONTENT)
def delete_master_resume(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> Response:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    key = master_resume_key(actor_id, is_session)
    if not services.object_store.exists(key):
        raise HTTPException(status_code=404, detail="Master resume not found.")

    services.object_store.delete(key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/resumes/history", response_model=ResumeHistoryResponse)
def get_resume_history(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> ResumeHistoryResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)
    prefix = f"{'temp' if is_session else 'users'}/{actor_id}/json/"
    keys = [key for key in services.object_store.list_keys(prefix) if key.endswith(".json")]

    history_items: list[ResumeHistoryItem] = []
    for key in keys:
        try:
            document_data = services.object_store.get_json(key)
            document = ResumeDocument.model_validate(document_data)
            display_name = _metadata_display_name(document.metadata)
            source_filename = None
            if isinstance(document.metadata, dict):
                raw_source = document.metadata.get("source")
                if isinstance(raw_source, str):
                    source_filename = _public_source_filename(raw_source)
            history_items.append(
                ResumeHistoryItem(
                    resume_id=document.resume_id,
                    json_key=key,
                    summary=document.summary,
                    display_name=display_name,
                    source_filename=source_filename,
                    created_at=document.created_at,
                    updated_at=document.updated_at,
                )
            )
        except Exception:
            continue

    history_items.sort(key=lambda item: item.updated_at, reverse=True)
    return ResumeHistoryResponse(items=history_items)


# ── Template static download ───────────────────────────────────────────────────

@router.get("/templates", tags=["templates"])
def list_templates() -> list[dict]:
    """Return the list of available .docx templates."""
    templates_dir = Path(__file__).parent.parent / "static" / "templates"
    result = []
    for f in sorted(templates_dir.glob("*.docx")):
        name = f.stem
        result.append({"name": name, "file_name": f.name})
    return result


@router.get("/templates/{template_name}", tags=["templates"])
def download_template(template_name: str) -> FileResponse:
    """Serve a blank .docx template file for download."""
    safe_name = Path(template_name).name
    templates_dir = Path(__file__).parent.parent / "static" / "templates"
    file_path = templates_dir / f"{safe_name}.docx"
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Template not found.")
    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{safe_name}.docx",
    )



def _normalize_provider(provider: str | None) -> str:
    raw = (provider or "").strip().lower()
    if raw in {"google", "gemini"}:
        return "gemini"
    if raw in {"openai", "anthropic"}:
        return raw
    return raw


def _resolve_validation_model(provider: str) -> str:
    if provider == "openai":
        return "openai/gpt-4o-mini"
    if provider == "anthropic":
        return "anthropic/claude-3-5-haiku-20241022"
    if provider == "gemini":
        return "gemini/gemini-2.5-flash"
    return "gemini/gemini-2.5-flash"


def _validate_ai_credentials_or_400(x_ai_provider: str | None, x_ai_model: str | None, x_ai_api_key: str | None) -> tuple[str, str]:
    provider = _normalize_provider(x_ai_provider)
    api_key = (x_ai_api_key or "").strip()
    if not provider:
        raise HTTPException(status_code=400, detail="Missing X-AI-Provider header.")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing X-AI-API-Key header.")
    model = _resolve_validation_model(provider)
    try:
        litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": "Respond with exactly: ok"}],
            max_tokens=3,
            timeout=15,
        )
    except Exception as exc:
        message = str(exc)
        status_code = 401
        if "rate limit" in message.lower() or "429" in message:
            status_code = 429
        elif "timeout" in message.lower():
            status_code = 503
        raise HTTPException(status_code=status_code, detail=f"AI credential validation failed for provider '{provider}': {message}") from exc
    return provider, model


@router.post("/ai/validate-key", response_model=ValidateAiKeyResponse)
def validate_ai_key(
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> ValidateAiKeyResponse:
    provider, model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    return ValidateAiKeyResponse(valid=True, provider=provider, model=model)


@router.post("/upload-url", response_model=UploadUrlResponse)
def create_upload_url(
    request: UploadUrlRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> UploadUrlResponse:
    _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)
    actor_prefix = f"{'temp' if is_session else 'users'}/{actor_id}/json/"

    output_json_key: str
    if request.source_type == "previous":
        if not request.source_json_key:
            raise HTTPException(status_code=400, detail="source_json_key is required for previous source jobs.")
        if not request.source_json_key.startswith(actor_prefix):
            raise HTTPException(status_code=403, detail="Invalid source_json_key for this user.")
        output_json_key = request.source_json_key
    else:
        new_resume_id = str(uuid4())
        output_json_key = resume_json_key(actor_id, new_resume_id, is_session)

    payload = GenerateJobPayload(
        mode=request.mode,
        source_type=request.source_type,
        source_json_key=request.source_json_key,
        input_s3_key=request.input_s3_key,
        source_notes=request.source_notes,
        output_json_key=output_json_key,
        template_id=request.template_id,
        user_id=user.user_id,
        session_id=user.session_id,
        target_role=request.target_role,
        target_company=request.target_company,
        job_description=request.job_description,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_model=x_ai_model, ai_api_key=x_ai_api_key)
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> RewritePreviewResponse:
    rewritten = services.tailor.rewrite_text(
        request.text,
        instruction=request.instruction,
        mode=request.mode,
        ai_provider=x_ai_provider,
        ai_model=x_ai_model,
        ai_api_key=x_ai_api_key,
    )
    return RewritePreviewResponse(rewritten_text=rewritten)


@router.get("/resume/{resume_id}", response_model=ResumeDocument)
def get_resume(
    resume_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> ResumeDocument:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    key = resume_json_key(actor_id, resume_id, is_session)
    if not services.object_store.exists(key):
        raise HTTPException(status_code=404, detail="Resume JSON not found.")

    document_data = services.object_store.get_json(key)
    return ResumeDocument.model_validate(document_data)


@router.delete("/resume/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> Response:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    json_key = resume_json_key(actor_id, resume_id, is_session)
    if not services.object_store.exists(json_key):
        raise HTTPException(status_code=404, detail="Resume not found.")

    services.object_store.delete(json_key)

    rendered_key = output_docx_key(actor_id, resume_id, is_session)
    if services.object_store.exists(rendered_key):
        services.object_store.delete(rendered_key)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/resume/{resume_id}/commit", response_model=CreateJobResponse, status_code=status.HTTP_202_ACCEPTED)
def commit_resume(
    resume_id: str,
    request: CommitResumeRequest,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> CreateJobResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = CommitJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
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
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = RenderJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        template_id=request.template_id,
        user_id=user.user_id,
        session_id=user.session_id,
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = RewriteJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
        targets=request.targets,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_model=x_ai_model, ai_api_key=x_ai_api_key)
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
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
    x_ai_api_key: str | None = Header(None, alias="X-AI-API-Key"),
) -> CreateJobResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    payload = ParseMasterJobPayload(
        user_id=user.user_id,
        session_id=user.session_id,
        input_s3_key=request.input_s3_key,
        filename=request.filename,
        content_type=request.content_type,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=x_ai_provider, ai_model=x_ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending")
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/master-resume", response_model=MasterResumeResponse)
def get_master_resume(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> MasterResumeResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)

    key = master_resume_key(actor_id, is_session)
    if not services.object_store.exists(key):
        return MasterResumeResponse(exists=False)
    document = services.object_store.get_json(key)
    return MasterResumeResponse(exists=True, document=document)


@router.get("/resumes/history", response_model=ResumeHistoryResponse)
def get_resume_history(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> ResumeHistoryResponse:
    actor_id = user.user_id or user.session_id
    is_session = not bool(user.user_id)
    prefix = f"{'temp' if is_session else 'users'}/{actor_id}/json/"
    keys = [key for key in services.object_store.list_keys(prefix) if key.endswith(".json")]

    history_items: list[ResumeHistoryItem] = []
    for key in keys:
        try:
            document_data = services.object_store.get_json(key)
            document = ResumeDocument.model_validate(document_data)
            display_name = _metadata_display_name(document.metadata)
            source_filename = None
            if isinstance(document.metadata, dict):
                raw_source = document.metadata.get("source")
                if isinstance(raw_source, str):
                    source_filename = _public_source_filename(raw_source)
            history_items.append(
                ResumeHistoryItem(
                    resume_id=document.resume_id,
                    json_key=key,
                    summary=document.summary,
                    display_name=display_name,
                    source_filename=source_filename,
                    created_at=document.created_at,
                    updated_at=document.updated_at,
                )
            )
        except Exception:
            continue

    history_items.sort(key=lambda item: item.updated_at, reverse=True)
    return ResumeHistoryResponse(items=history_items)


# ── Template download ──────────────────────────────────────────────────────────

@router.get("/templates", tags=["templates"])
def list_templates() -> list[dict]:
    """Return the list of available .docx templates."""
    templates_dir = Path(__file__).parent.parent / "static" / "templates"
    result = []
    for f in sorted(templates_dir.glob("*.docx")):
        name = f.stem  # e.g. "modern"
        result.append({"name": name, "file_name": f.name})
    return result


@router.get("/templates/{template_name}", tags=["templates"])
def download_template(template_name: str) -> FileResponse:
    """Serve a .docx template file for browser download."""
    # Sanitise: strip path separators to prevent traversal
    safe_name = Path(template_name).name
    templates_dir = Path(__file__).parent.parent / "static" / "templates"
    file_path = templates_dir / f"{safe_name}.docx"
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Template not found.")
    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{safe_name}.docx",
    )
