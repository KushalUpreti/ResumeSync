from __future__ import annotations

from pydantic import BaseModel


class UserContext(BaseModel):
    user_id: str | None = None
    session_id: str | None = None
    is_anonymous: bool = False

    @property
    def actor_id(self) -> str:
        return self.user_id or self.session_id or "anonymous"
