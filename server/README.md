# ResumeSync Backend

This folder contains a backend scaffold that matches the architecture in [design.md](/C:/Courses/ResumeSync/server/design.md).

## What is included

- FastAPI API routes for upload URLs, jobs, resume commit/render, rewrite preview, and master resume flows
- A worker loop that processes queued jobs
- Typed models for resume JSON and job payloads
- Storage-key helpers that encode the S3 layout from the design doc
- Service interfaces so S3, SQS, Cognito, AI, parsing, and rendering can be swapped in cleanly
- Local development adapters so the flow can run without wiring AWS on day one
- A container image setup that can run either the API or the worker on ECS Fargate

## Run the API

```bash
uvicorn app.main:app --reload --app-dir .
```

## Run the worker

```bash
python -m app.worker.runner
```

## Build the container

From the `server` directory:

```bash
docker build -t resumesync-server .
```

Run the API container locally:

```bash
docker run --rm -p 8000:8000 --env-file .env.example resumesync-server
```

Run the worker container locally:

```bash
docker run --rm --env-file .env.example resumesync-server python -m app.worker.runner
```

## Environment

Optional environment variables:

- `RESUMESYNC_ENV`
- `RESUMESYNC_USE_AWS_SERVICES`
- `RESUMESYNC_AWS_REGION`
- `RESUMESYNC_DATA_ROOT`
- `RESUMESYNC_STORAGE_BUCKET`
- `RESUMESYNC_QUEUE_NAME`
- `RESUMESYNC_QUEUE_URL`
- `RESUMESYNC_POLL_INTERVAL_SECONDS`
- `RESUMESYNC_COGNITO_USER_POOL_ID`
- `RESUMESYNC_COGNITO_REGION`
- `RESUMESYNC_COGNITO_APP_CLIENT_ID`

## Notes

The local adapters are intentionally thin. They mirror the backend control flow while keeping the application layer isolated from infrastructure-specific code, so real AWS-backed implementations can replace them later with minimal surface-area changes.

When `RESUMESYNC_USE_AWS_SERVICES=true`, the app now uses:

- real S3 object storage for uploads, JSON documents, outputs, and job state
- real SQS queue send/receive/delete behavior
- Cognito JWT verification for bearer tokens

Parsing, AI tailoring, and rendering are still represented by placeholder service implementations and should be replaced with your production integrations before launch.

## ECS Fargate

The repo now includes:

- [Dockerfile](/C:/Courses/ResumeSync/server/Dockerfile)
- [server/.dockerignore](/C:/Courses/ResumeSync/server/.dockerignore)
- [server/.env.example](/C:/Courses/ResumeSync/server/.env.example)
- [server/.env.aws](/C:/Courses/ResumeSync/server/.env.aws)
- [server/ecs/api-task-definition.json](/C:/Courses/ResumeSync/server/ecs/api-task-definition.json)
- [server/ecs/worker-task-definition.json](/C:/Courses/ResumeSync/server/ecs/worker-task-definition.json)
- [server/ecs/api-task-role-policy.json](/C:/Courses/ResumeSync/server/ecs/api-task-role-policy.json)
- [server/ecs/worker-task-role-policy.json](/C:/Courses/ResumeSync/server/ecs/worker-task-role-policy.json)

Recommended deployment model:

- Build one image and push it to ECR
- Run one ECS service for the API behind an ALB
- Run one ECS service for the worker with the same image but a different command

High-level AWS steps:

1. Create an ECR repository such as `resumesync-server`
2. Build and push the image
3. Create CloudWatch log groups `/ecs/resumesync-api` and `/ecs/resumesync-worker`
4. Create an ECS cluster
5. Register the API and worker task definitions from `server/ecs/`
6. Create an ECS service for the API with port `8000`
7. Create an ECS service for the worker with desired count based on queue demand
8. Attach IAM task roles with S3/SQS permissions
9. Replace the local adapters with AWS-backed service implementations before production traffic

Suggested ECR flow:

```bash
aws ecr create-repository --repository-name resumesync-server
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t resumesync-server .
docker tag resumesync-server:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/resumesync-server:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/resumesync-server:latest
```

Before registering the task definitions, replace placeholder values like `<account-id>`, `<s3-bucket-name>`, and `<main-sqs-queue-url>`.
