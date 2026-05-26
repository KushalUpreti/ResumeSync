from __future__ import annotations

import json
from typing import Any

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import Settings
from app.core.exceptions import InvalidStateError, NotFoundError
from app.models.jobs import JobEnvelope, QueuedJob
from app.services.interfaces import ObjectStore, PresignedUpload, QueueService


class S3ObjectStore(ObjectStore):
    def __init__(self, settings: Settings) -> None:
        self.bucket = settings.storage_bucket
        self.client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        )

    def create_presigned_upload(self, object_key: str, content_type: str) -> PresignedUpload:
        upload_url = self.client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.bucket,
                "Key": object_key,
                "ContentType": content_type,
            },
            ExpiresIn=3600,
            HttpMethod="PUT",
        )
        return PresignedUpload(
            upload_url=upload_url,
            object_key=object_key,
            method="PUT",
            headers={"content-type": content_type},
        )

    def put_json(self, object_key: str, data: dict) -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=object_key,
            Body=json.dumps(data, default=str).encode("utf-8"),
            ContentType="application/json",
        )

    def get_json(self, object_key: str) -> dict:
        response = self._get_object(object_key)
        return json.loads(response["Body"].read().decode("utf-8"))

    def put_bytes(self, object_key: str, content: bytes) -> None:
        self.client.put_object(Bucket=self.bucket, Key=object_key, Body=content)

    def get_bytes(self, object_key: str) -> bytes:
        response = self._get_object(object_key)
        return response["Body"].read()

    def exists(self, object_key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=object_key)
            return True
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code in {"404", "NoSuchKey", "NotFound"}:
                return False
            raise

    def delete(self, object_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=object_key)

    def list_keys(self, prefix: str) -> list[str]:
        keys: list[str] = []
        continuation_token: str | None = None
        while True:
            params: dict[str, Any] = {"Bucket": self.bucket, "Prefix": prefix}
            if continuation_token:
                params["ContinuationToken"] = continuation_token
            response = self.client.list_objects_v2(**params)
            for item in response.get("Contents", []):
                key = item.get("Key")
                if key:
                    keys.append(key)
            if not response.get("IsTruncated"):
                break
            continuation_token = response.get("NextContinuationToken")
        return sorted(keys)

    def _get_object(self, object_key: str) -> dict[str, Any]:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=object_key)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code in {"404", "NoSuchKey", "NotFound"}:
                raise NotFoundError(f"Object not found: {object_key}") from exc
            raise


class SQSQueueService(QueueService):
    def __init__(self, settings: Settings) -> None:
        self.client: BaseClient = boto3.client("sqs", region_name=settings.aws_region)
        self.queue_url = settings.queue_url or self._resolve_queue_url(settings.queue_name)

    def send(self, envelope: JobEnvelope) -> None:
        self.client.send_message(
            QueueUrl=self.queue_url,
            MessageBody=envelope.model_dump_json(),
        )

    def receive(self, max_messages: int = 1) -> list[QueuedJob]:
        response = self.client.receive_message(
            QueueUrl=self.queue_url,
            MaxNumberOfMessages=max_messages,
            WaitTimeSeconds=20,
            MessageAttributeNames=["All"],
            AttributeNames=["All"],
        )
        jobs: list[QueuedJob] = []
        for message in response.get("Messages", []):
            body = message["Body"]
            envelope = JobEnvelope.model_validate_json(body)
            jobs.append(
                QueuedJob(
                    envelope=envelope,
                    receipt_handle=message["ReceiptHandle"],
                )
            )
        return jobs

    def acknowledge(self, job: QueuedJob) -> None:
        if not job.receipt_handle:
            raise InvalidStateError("SQS queued job is missing receipt_handle")
        self.client.delete_message(
            QueueUrl=self.queue_url,
            ReceiptHandle=job.receipt_handle,
        )

    def _resolve_queue_url(self, queue_name: str) -> str:
        response = self.client.get_queue_url(QueueName=queue_name)
        return response["QueueUrl"]
