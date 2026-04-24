from __future__ import annotations

from dataclasses import dataclass, field

import jwt
from jwt import PyJWKClient

from app.core.config import Settings
from app.core.exceptions import InvalidStateError
from app.models.auth import UserContext


@dataclass(slots=True)
class CognitoTokenVerifier:
    issuer: str
    jwks_url: str
    app_client_id: str | None
    jwks_client: PyJWKClient = field(init=False)

    def __post_init__(self) -> None:
        self.jwks_client = PyJWKClient(self.jwks_url)

    @classmethod
    def from_settings(cls, settings: Settings) -> "CognitoTokenVerifier":
        if not settings.cognito_user_pool_id:
            raise InvalidStateError("RESUMESYNC_COGNITO_USER_POOL_ID is required")
        region = settings.cognito_region or settings.aws_region
        issuer = f"https://cognito-idp.{region}.amazonaws.com/{settings.cognito_user_pool_id}"
        jwks_url = f"{issuer}/.well-known/jwks.json"
        return cls(
            issuer=issuer,
            jwks_url=jwks_url,
            app_client_id=settings.cognito_app_client_id,
        )

    def verify(self, token: str) -> UserContext:
        signing_key = self.jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=self.issuer,
            options={"verify_aud": False},
        )

        token_use = claims.get("token_use")
        if token_use not in {"access", "id"}:
            raise InvalidStateError("Unsupported Cognito token_use")

        if self.app_client_id:
            if token_use == "id" and claims.get("aud") != self.app_client_id:
                raise InvalidStateError("Invalid Cognito ID token audience")
            if token_use == "access" and claims.get("client_id") != self.app_client_id:
                raise InvalidStateError("Invalid Cognito access token client_id")

        return UserContext(
            user_id=claims.get("sub"),
            session_id=None,
            is_anonymous=False,
        )
