from __future__ import annotations

from fastapi import Depends, Header, HTTPException

from app.models.auth import UserContext
from app.services.container import ServiceContainer, get_container


def get_services() -> ServiceContainer:
    return get_container()


def get_user_context(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    x_session_id: str | None = Header(default=None),
    x_anonymous: bool = Header(default=False),
    services: ServiceContainer = Depends(get_services),
) -> UserContext:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if not services.token_verifier:
            raise HTTPException(status_code=503, detail="Token verification is not configured")
        try:
            return services.token_verifier.verify(token)
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Invalid bearer token: {exc}") from exc

    return UserContext(
        user_id=x_user_id,
        session_id=x_session_id,
        is_anonymous=x_anonymous,
    )
