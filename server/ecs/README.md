# ECS / Fargate Notes

This folder contains starter task definition templates for deploying the backend to ECS Fargate.

## Deployment shape

- One image in ECR: `resumesync-server`
- One ECS service for the FastAPI API
- One ECS service for the background worker

Both services use the same image and differ only by command:

- API command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Worker command: `python -m app.worker.runner`

## Replace placeholders

Update these values before registering the task definitions:

- `<account-id>`
- `aws-resume-bucket-kushal-upreti`
- `<main-sqs-queue-url>`

## Roles

Execution role:

- Pull image from ECR
- Write logs to CloudWatch

API task role should eventually allow:

- `s3:GetObject`
- `s3:PutObject`
- `sqs:SendMessage`

Worker task role should eventually allow:

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `sqs:ReceiveMessage`
- `sqs:DeleteMessage`
- `sqs:ChangeMessageVisibility`

Starter policy templates are included in:

- [api-task-role-policy.json](/C:/Courses/ResumeSync/server/ecs/api-task-role-policy.json)
- [worker-task-role-policy.json](/C:/Courses/ResumeSync/server/ecs/worker-task-role-policy.json)

## Important gap

The current application now has AWS-backed adapters for S3, SQS, and Cognito token validation. The remaining placeholders are the resume parser, AI tailorer, and final document renderer.
