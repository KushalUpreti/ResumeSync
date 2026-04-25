from __future__ import annotations


def temp_upload_key(session_id: str, filename: str) -> str:
    return f"temp/{session_id}/{filename}"


def _actor_prefix(actor_id: str, is_session: bool = False) -> str:
    if is_session:
        return f"temp/{actor_id}"
    return f"users/{actor_id}"


def master_resume_key(actor_id: str, is_session: bool = False) -> str:
    return f"{_actor_prefix(actor_id, is_session)}/master/master.json"


def resume_json_key(actor_id: str, resume_id: str, is_session: bool = False) -> str:
    return f"{_actor_prefix(actor_id, is_session)}/json/{resume_id}.json"


def output_docx_key(actor_id: str, resume_id: str, is_session: bool = False) -> str:
    return f"{_actor_prefix(actor_id, is_session)}/outputs/{resume_id}.docx"


def job_state_key(job_id: str) -> str:
    return f"jobs/{job_id}.json"
