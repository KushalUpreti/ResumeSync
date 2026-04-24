from __future__ import annotations


def temp_upload_key(session_id: str, filename: str) -> str:
    return f"temp/{session_id}/{filename}"


def master_resume_key(user_id: str) -> str:
    return f"users/{user_id}/master/master.json"


def resume_json_key(user_id: str, resume_id: str) -> str:
    return f"users/{user_id}/json/{resume_id}.json"


def output_docx_key(user_id: str, resume_id: str) -> str:
    return f"users/{user_id}/outputs/{resume_id}.docx"


def job_state_key(job_id: str) -> str:
    return f"jobs/{job_id}.json"
