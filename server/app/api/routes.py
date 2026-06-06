from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re
from uuid import uuid4

import litellm
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from fastapi.responses import FileResponse, StreamingResponse

from app.api.deps import get_services, get_user_context
from app.core.config import get_settings
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
ALLOWED_AI_MODELS = {
    "openai": {"gpt-5.5", "gpt-5.4-pro", "gpt-5.4-mini", "gpt-4o-mini"},
    "anthropic": {
        "anthropic/claude-4-8-opus-latest",
        "anthropic/claude-4-6-sonnet-latest",
        "anthropic/claude-4-5-haiku-latest",
        "anthropic/claude-3-5-haiku-20241022",
    },
    "gemini": {
        "gemini/gemini-3.1-flash-lite",
        "gemini/gemini-2.5-flash-lite",
        "gemini/gemini-3-flash",
        "gemini/gemini-2.5-flash",
    },
    "bedrock": {
        "bedrock/converse/us.amazon.nova-2-lite-v1:0",
        "bedrock/converse/us.amazon.nova-premier-v1:0",
        "bedrock/converse/us.amazon.nova-pro-v1:0",
        "bedrock/converse/us.amazon.nova-lite-v1:0",
        "bedrock/converse/us.amazon.nova-micro-v1:0",
    },
}

SECRET_PATTERN = re.compile(r"\b(?:sk|sk-proj|sk-ant|AIza)[A-Za-z0-9_\-]{12,}\b")


def _redact_secret(value: str) -> str:
    return SECRET_PATTERN.sub(lambda match: f"{match.group(0)[:6]}...{match.group(0)[-4:]}", value)


def _extract_upstream_status_code(exc: Exception) -> int | None:
    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    response = getattr(exc, "response", None)
    response_status = getattr(response, "status_code", None)
    if isinstance(response_status, int):
        return response_status

    return None


def _classify_ai_validation_error(exc: Exception) -> tuple[int, str]:
    error_type = exc.__class__.__name__
    message = str(exc).lower()
    upstream_status_code = _extract_upstream_status_code(exc)

    if upstream_status_code in {400, 401, 402, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504}:
        status_code = upstream_status_code
    elif error_type in {"AuthenticationError", "OpenAIError"} and "api key" in message:
        status_code = 401
    elif error_type in {"PermissionDeniedError"}:
        status_code = 403
    elif error_type in {"RateLimitError"} or "rate limit" in message or "429" in message:
        status_code = 429
    elif "quota" in message or "billing" in message or "credit" in message:
        status_code = 402
    elif error_type in {"Timeout", "APITimeoutError"} or "timeout" in message or "timed out" in message:
        status_code = 503
    elif error_type in {"APIConnectionError", "ServiceUnavailableError"}:
        status_code = 503
    elif error_type in {"BadRequestError", "InvalidRequestError", "ContextWindowExceededError"}:
        status_code = 400
    elif "model" in message and ("not found" in message or "does not exist" in message or "unsupported" in message):
        status_code = 404
    else:
        status_code = 502

    if status_code == 401:
        reason = "Authentication failed. Check that the API key belongs to the selected provider/project and has not been revoked."
    elif status_code == 402:
        reason = "Billing or quota is not available. Add API credits/payment details or check the project's usage limits."
    elif status_code == 403:
        reason = "Access was forbidden. Check project permissions, organization/project headers, model access, or IP allowlists."
    elif status_code == 404:
        reason = "The selected model was not found or is not available for this provider/project."
    elif status_code == 429:
        reason = "Rate limit exceeded. Wait and retry, or choose a lower-throughput model/project."
    elif status_code == 503:
        reason = "The provider request timed out or the provider is temporarily unavailable."
    elif status_code == 400:
        reason = "The provider rejected the validation request. Check the selected model and provider configuration."
    else:
        reason = "The provider returned an unexpected error while validating credentials."

    return status_code, reason


def _ai_validation_error_detail(provider: str, model: str, exc: Exception) -> str:
    status_code, reason = _classify_ai_validation_error(exc)
    upstream_status_code = _extract_upstream_status_code(exc)
    provider_message = _redact_secret(getattr(exc, "message", None) or str(exc))
    error_type = exc.__class__.__name__

    status_label = f"status {status_code}"
    if upstream_status_code and upstream_status_code != status_code:
        status_label = f"status {status_code}, upstream status {upstream_status_code}"

    return (
        f"AI credential validation failed for provider '{provider}' using model '{model}' "
        f"({error_type}, {status_label}). {reason} Provider message: {provider_message}"
    )


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
    if raw in {"aws", "aws bedrock", "bedrock"}:
        return "bedrock"
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
    if provider == "bedrock":
        return "bedrock/converse/us.amazon.nova-2-lite-v1:0"
    return "gemini/gemini-2.5-flash"


def _litellm_completion_kwargs(provider: str, api_key: str | None) -> dict[str, str]:
    kwargs: dict[str, str] = {}
    if api_key:
        kwargs["api_key"] = api_key
    if provider == "bedrock":
        kwargs["aws_region_name"] = get_settings().aws_region
    return kwargs


def _resolve_requested_model(provider: str, requested_model: str | None) -> str:
    model = (requested_model or "").strip()
    if not model:
        return _resolve_validation_model(provider)
    if provider == "bedrock" and model.startswith("bedrock/converse/amazon.nova"):
        model = model.replace("bedrock/converse/amazon.nova", "bedrock/converse/us.amazon.nova")
    if model not in ALLOWED_AI_MODELS.get(provider, set()):
        raise HTTPException(status_code=400, detail=f"Unsupported AI model '{model}' for provider '{provider}'.")
    return model


def _validate_ai_credentials_or_400(x_ai_provider: str | None, x_ai_model: str | None, x_ai_api_key: str | None) -> tuple[str, str]:
    provider = _normalize_provider(x_ai_provider)
    api_key = (x_ai_api_key or "").strip()
    if not provider:
        raise HTTPException(status_code=400, detail="Missing X-AI-Provider header.")
    if provider not in ALLOWED_AI_MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported AI provider '{provider}'.")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing X-AI-API-Key header.")
    model = _resolve_requested_model(provider, x_ai_model)
    try:
        litellm.completion(
            model=model,
            messages=[{"role": "user", "content": "Respond with exactly: ok"}],
            max_tokens=3,
            timeout=15,
            **_litellm_completion_kwargs(provider, api_key),
        )
    except Exception as exc:
        status_code, _reason = _classify_ai_validation_error(exc)
        raise HTTPException(status_code=status_code, detail=_ai_validation_error_detail(provider, model, exc)) from exc
    return provider, model


def _actor_details(user: UserContext) -> tuple[str, bool]:
    actor_id = user.user_id or user.session_id
    if not actor_id:
        raise HTTPException(status_code=401, detail="Missing user or session context.")
    return actor_id, not bool(user.user_id)


def _temp_prefix(actor_id: str) -> str:
    return f"temp/{actor_id}/"


def _json_prefix(actor_id: str, is_session: bool) -> str:
    return f"{'temp' if is_session else 'users'}/{actor_id}/json/"


def _validate_temp_upload_key_for_actor(object_key: str | None, actor_id: str) -> None:
    if not object_key or not object_key.startswith(_temp_prefix(actor_id)):
        raise HTTPException(status_code=403, detail="Invalid upload key for this user.")


def _assert_job_owner(state: JobState, user: UserContext) -> None:
    if state.user_id:
        if user.user_id != state.user_id:
            raise HTTPException(status_code=403, detail="Invalid job for this user.")
        return
    if state.session_id:
        if user.session_id != state.session_id:
            raise HTTPException(status_code=403, detail="Invalid job for this session.")


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
    actor_id, _is_session = _actor_details(user)
    suffix = Path(request.filename).suffix or ".docx"
    object_key = temp_upload_key(actor_id, f"{uuid4()}{suffix}")
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id, is_session = _actor_details(user)
    actor_prefix = _json_prefix(actor_id, is_session)

    output_json_key: str
    if request.source_type == "previous":
        if not request.source_json_key:
            raise HTTPException(status_code=400, detail="source_json_key is required for previous source jobs.")
        if not request.source_json_key.startswith(actor_prefix):
            raise HTTPException(status_code=403, detail="Invalid source_json_key for this user.")
        output_json_key = request.source_json_key
    else:
        if request.source_type == "new_upload":
            _validate_temp_upload_key_for_actor(request.input_s3_key, actor_id)
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
    envelope = JobEnvelope(payload=payload, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/jobs/{job_id}", response_model=JobState)
def get_job(
    job_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> JobState:
    try:
        state = services.job_states.get(job_id)
        _assert_job_owner(state, user)
        return state
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    rewritten = services.tailor.rewrite_text(
        request.text,
        instruction=request.instruction,
        mode=request.mode,
        ai_provider=ai_provider,
        ai_model=ai_model,
        ai_api_key=x_ai_api_key,
    )
    return RewritePreviewResponse(rewritten_text=rewritten)


@router.get("/resume/{resume_id}", response_model=ResumeDocument)
def get_resume(
    resume_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> ResumeDocument:
    actor_id, is_session = _actor_details(user)

    key = resume_json_key(actor_id, resume_id, is_session)
    if not services.object_store.exists(key):
        raise HTTPException(status_code=404, detail="Resume JSON not found.")

    document_data = services.object_store.get_json(key)
    return ResumeDocument.model_validate(document_data)


@router.delete("/resume/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    json_key: str | None = Query(default=None, description="Exact storage key for older resume history entries."),
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> Response:
    actor_id, is_session = _actor_details(user)

    expected_prefix = _json_prefix(actor_id, is_session)
    target_json_key = json_key or resume_json_key(actor_id, resume_id, is_session)
    if not target_json_key.startswith(expected_prefix):
        raise HTTPException(status_code=403, detail="Invalid resume key for this user.")
    if not services.object_store.exists(target_json_key):
        raise HTTPException(status_code=404, detail="Resume not found.")

    services.object_store.delete(target_json_key)

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
    actor_id, is_session = _actor_details(user)
    expected_prefix = _json_prefix(actor_id, is_session)

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
    actor_id, is_session = _actor_details(user)

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
    actor_id, is_session = _actor_details(user)

    payload = CommitJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
        document=request.document.model_copy(update={"resume_id": resume_id}),
    )
    envelope = JobEnvelope(payload=payload)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
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
    actor_id, is_session = _actor_details(user)

    payload = RenderJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        template_id=request.template_id,
        user_id=user.user_id,
        session_id=user.session_id,
    )
    envelope = JobEnvelope(payload=payload)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id, is_session = _actor_details(user)

    payload = RewriteJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
        targets=request.targets,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id, is_session = _actor_details(user)
    _validate_temp_upload_key_for_actor(request.input_s3_key, actor_id)

    payload = ParseMasterJobPayload(
        user_id=user.user_id,
        session_id=user.session_id,
        input_s3_key=request.input_s3_key,
        filename=request.filename,
        content_type=request.content_type,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/master-resume", response_model=MasterResumeResponse)
def get_master_resume(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> MasterResumeResponse:
    actor_id, is_session = _actor_details(user)

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
    actor_id, is_session = _actor_details(user)

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
    actor_id, is_session = _actor_details(user)
    prefix = _json_prefix(actor_id, is_session)
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
    if raw in {"aws", "aws bedrock", "bedrock"}:
        return "bedrock"
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
    if provider == "bedrock":
        return "bedrock/converse/us.amazon.nova-2-lite-v1:0"
    return "gemini/gemini-2.5-flash"


def _resolve_requested_model(provider: str, requested_model: str | None) -> str:
    model = (requested_model or "").strip()
    if not model:
        return _resolve_validation_model(provider)
    if provider == "bedrock" and model.startswith("bedrock/converse/amazon.nova"):
        model = model.replace("bedrock/converse/amazon.nova", "bedrock/converse/us.amazon.nova")
    if model not in ALLOWED_AI_MODELS.get(provider, set()):
        raise HTTPException(status_code=400, detail=f"Unsupported AI model '{model}' for provider '{provider}'.")
    return model


def _validate_ai_credentials_or_400(x_ai_provider: str | None, x_ai_model: str | None, x_ai_api_key: str | None) -> tuple[str, str]:
    provider = _normalize_provider(x_ai_provider)
    api_key = (x_ai_api_key or "").strip()
    if not provider:
        raise HTTPException(status_code=400, detail="Missing X-AI-Provider header.")
    if provider not in ALLOWED_AI_MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported AI provider '{provider}'.")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing X-AI-API-Key header.")
    model = _resolve_requested_model(provider, x_ai_model)
    try:
        litellm.completion(
            model=model,
            messages=[{"role": "user", "content": "Respond with exactly: ok"}],
            max_tokens=3,
            timeout=15,
            **_litellm_completion_kwargs(provider, api_key),
        )
    except Exception as exc:
        status_code, _reason = _classify_ai_validation_error(exc)
        raise HTTPException(status_code=status_code, detail=_ai_validation_error_detail(provider, model, exc)) from exc
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
    session_id, _is_session = _actor_details(user)
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id, is_session = _actor_details(user)
    actor_prefix = _json_prefix(actor_id, is_session)

    output_json_key: str
    if request.source_type == "previous":
        if not request.source_json_key:
            raise HTTPException(status_code=400, detail="source_json_key is required for previous source jobs.")
        if not request.source_json_key.startswith(actor_prefix):
            raise HTTPException(status_code=403, detail="Invalid source_json_key for this user.")
        output_json_key = request.source_json_key
    else:
        if request.source_type == "new_upload":
            _validate_temp_upload_key_for_actor(request.input_s3_key, actor_id)
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
    envelope = JobEnvelope(payload=payload, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/jobs/{job_id}", response_model=JobState)
def get_job(
    job_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> JobState:
    try:
        state = services.job_states.get(job_id)
        _assert_job_owner(state, user)
        return state
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    rewritten = services.tailor.rewrite_text(
        request.text,
        instruction=request.instruction,
        mode=request.mode,
        ai_provider=ai_provider,
        ai_model=ai_model,
        ai_api_key=x_ai_api_key,
    )
    return RewritePreviewResponse(rewritten_text=rewritten)


@router.get("/resume/{resume_id}", response_model=ResumeDocument)
def get_resume(
    resume_id: str,
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> ResumeDocument:
    actor_id, is_session = _actor_details(user)

    key = resume_json_key(actor_id, resume_id, is_session)
    if not services.object_store.exists(key):
        raise HTTPException(status_code=404, detail="Resume JSON not found.")

    document_data = services.object_store.get_json(key)
    return ResumeDocument.model_validate(document_data)


@router.delete("/resume/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    json_key: str | None = Query(default=None, description="Exact storage key for older resume history entries."),
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> Response:
    actor_id, is_session = _actor_details(user)

    expected_prefix = _json_prefix(actor_id, is_session)
    target_json_key = json_key or resume_json_key(actor_id, resume_id, is_session)
    if not target_json_key.startswith(expected_prefix):
        raise HTTPException(status_code=403, detail="Invalid resume key for this user.")
    if not services.object_store.exists(target_json_key):
        raise HTTPException(status_code=404, detail="Resume not found.")

    services.object_store.delete(target_json_key)

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
    actor_id, is_session = _actor_details(user)

    payload = CommitJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
        document=request.document.model_copy(update={"resume_id": resume_id}),
    )
    envelope = JobEnvelope(payload=payload)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
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
    actor_id, is_session = _actor_details(user)

    payload = RenderJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        template_id=request.template_id,
        user_id=user.user_id,
        session_id=user.session_id,
    )
    envelope = JobEnvelope(payload=payload)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id, is_session = _actor_details(user)

    payload = RewriteJobPayload(
        resume_id=resume_id,
        resume_json_key=resume_json_key(actor_id, resume_id, is_session),
        user_id=user.user_id,
        session_id=user.session_id,
        targets=request.targets,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
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
    ai_provider, ai_model = _validate_ai_credentials_or_400(x_ai_provider, x_ai_model, x_ai_api_key)
    actor_id, is_session = _actor_details(user)
    _validate_temp_upload_key_for_actor(request.input_s3_key, actor_id)

    payload = ParseMasterJobPayload(
        user_id=user.user_id,
        session_id=user.session_id,
        input_s3_key=request.input_s3_key,
        filename=request.filename,
        content_type=request.content_type,
    )
    envelope = JobEnvelope(payload=payload, ai_provider=ai_provider, ai_model=ai_model, ai_api_key=x_ai_api_key)
    state = JobState(job_id=envelope.job_id, status="pending", user_id=user.user_id, session_id=user.session_id)
    services.job_states.create(state)
    services.queue.send(envelope)
    return CreateJobResponse(job_id=envelope.job_id, status=state.status)


@router.get("/master-resume", response_model=MasterResumeResponse)
def get_master_resume(
    user: UserContext = Depends(get_user_context),
    services: ServiceContainer = Depends(get_services),
) -> MasterResumeResponse:
    actor_id, is_session = _actor_details(user)

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
    actor_id, is_session = _actor_details(user)
    prefix = _json_prefix(actor_id, is_session)
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
