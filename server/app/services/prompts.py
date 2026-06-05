from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from string import Template
from time import monotonic

from app.core.config import Settings
from app.core.exceptions import NotFoundError
from app.services.interfaces import ObjectStore


SYSTEM_MARKER = "---SYSTEM---"
USER_MARKER = "---USER---"


@dataclass(frozen=True, slots=True)
class RenderedPrompt:
    prompt_id: str
    version: str
    source: str
    content: str


class PromptRegistry:
    def __init__(
        self,
        object_store: ObjectStore,
        settings: Settings,
        *,
        fallback_root: Path | None = None,
        cache_ttl_seconds: int = 300,
    ) -> None:
        self.object_store = object_store
        self.prefix = settings.prompt_prefix.strip("/")
        self.fallback_root = fallback_root or Path(__file__).resolve().parents[1] / "prompts"
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: dict[str, tuple[float, str, str]] = {}

    def render(self, prompt_id: str, variables: dict[str, object], *, version: str = "v1") -> RenderedPrompt:
        template, source = self._load_template(prompt_id, version)
        values = {key: "" if value is None else str(value) for key, value in variables.items()}
        return RenderedPrompt(
            prompt_id=prompt_id,
            version=version,
            source=source,
            content=Template(template).safe_substitute(values),
        )

    def render_messages(self, prompt_id: str, variables: dict[str, object], *, version: str = "v1") -> tuple[list[dict[str, str]], RenderedPrompt]:
        rendered = self.render(prompt_id, variables, version=version)
        messages = self._split_messages(rendered.content)
        return messages, rendered

    def _load_template(self, prompt_id: str, version: str) -> tuple[str, str]:
        object_key = self._object_key(prompt_id, version)
        now = monotonic()
        cached = self._cache.get(object_key)
        if cached and cached[0] > now:
            return cached[1], cached[2]

        try:
            template = self.object_store.get_bytes(object_key).decode("utf-8")
            source = "s3"
        except NotFoundError:
            template = self._load_fallback(prompt_id, version)
            source = "local"

        self._cache[object_key] = (now + self.cache_ttl_seconds, template, source)
        return template, source

    def _load_fallback(self, prompt_id: str, version: str) -> str:
        path = (self.fallback_root / prompt_id / f"{version}.md").resolve()
        try:
            path.relative_to(self.fallback_root.resolve())
        except ValueError as exc:
            raise ValueError("Prompt path escapes fallback prompt root") from exc
        if not path.exists():
            raise NotFoundError(f"Prompt not found in S3 or local fallback: {prompt_id}/{version}.md")
        return path.read_text(encoding="utf-8")

    def _object_key(self, prompt_id: str, version: str) -> str:
        return f"{self.prefix}/{prompt_id}/{version}.md"

    def _split_messages(self, content: str) -> list[dict[str, str]]:
        if SYSTEM_MARKER not in content or USER_MARKER not in content:
            return [{"role": "user", "content": content.strip()}]

        before_user, user_content = content.split(USER_MARKER, 1)
        _before_system, system_content = before_user.split(SYSTEM_MARKER, 1)
        return [
            {"role": "system", "content": system_content.strip()},
            {"role": "user", "content": user_content.strip()},
        ]
