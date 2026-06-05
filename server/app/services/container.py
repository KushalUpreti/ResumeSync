from __future__ import annotations

from functools import lru_cache

from app.core.config import Settings, get_settings
from app.services.aws_adapters import S3ObjectStore, SQSQueueService
from app.services.cognito import CognitoTokenVerifier
from app.services.local_adapters import (
    LocalObjectStore,
    LocalQueueService,
    S3BackedJobStateStore,
)
from app.services.llm_adapters import LLMResumeParser, LLMResumeTailor
from app.services.document_engine import DocxtplDocumentRenderer
from app.services.prompts import PromptRegistry


class ServiceContainer:
    def __init__(self, settings: Settings | None = None) -> None:
        settings = settings or get_settings()
        self.settings = settings

        if settings.use_aws_services:
            self.object_store = S3ObjectStore(settings)
            self.queue = SQSQueueService(settings)
            self.token_verifier = CognitoTokenVerifier.from_settings(settings)
        else:
            self.object_store = LocalObjectStore(settings.data_root)
            self.queue = LocalQueueService(settings.data_root)
            self.token_verifier = None

        self.job_states = S3BackedJobStateStore(self.object_store)
        self.prompts = PromptRegistry(self.object_store, settings)
        self.parser = LLMResumeParser(self.prompts)
        self.tailor = LLMResumeTailor(self.prompts)
        self.renderer = DocxtplDocumentRenderer()


@lru_cache(maxsize=1)
def get_container() -> ServiceContainer:
    return ServiceContainer()
