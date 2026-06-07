# ResumeSync

ResumeSync is a full-stack AI resume workspace for turning rough notes, existing resumes, or saved resume versions into ATS-aware, role-ready `.docx` resumes. It lets users bring their own model key, choose a tailoring mode, review AI-generated improvements, edit the structured resume, and export a clean document from reusable templates.

The project is built around a simple principle: resume data lives as structured JSON, and `.docx` files are only generated as final outputs. That keeps parsing, tailoring, review, history, and rendering separate from document formatting.

## What It Does

- Generates polished resumes from uploaded files, pasted notes, master resumes, or previous generated resumes.
- Supports two tailoring modes:
  - **Polisher** for broad clarity, tone, structure, and ATS improvements.
  - **Sniper** for role-specific tailoring against a target role, company, or job description.
- Validates user-provided AI credentials before running generation.
- Supports OpenAI, Anthropic, Google Gemini, and AWS Bedrock model providers through LiteLLM.
- Extracts resume content from `.pdf`, `.docx`, and plain text sources.
- Stores resume drafts as JSON so users can review and edit generated sections before export.
- Shows AI improvement summaries and supports rewrite previews for targeted edits.
- Exports final resumes as `.docx` using bundled templates.
- Supports guest sessions without login, plus Cognito-backed sign-in for persistent master resume storage and history.
- Includes local adapters for development and optional AWS-backed S3, SQS, and Cognito services for deployment.

## User Workflow

1. **Configure**
   Choose an AI provider/model and add a bring-your-own API key.

2. **Ingest**
   Upload a resume, paste career notes, use a saved master resume, or start from a previous generated resume.

3. **Generate and Review**
   ResumeSync parses the source into structured JSON, runs the selected AI tailoring flow, and presents the result for review.

4. **Edit**
   Review AI improvements, adjust sections, and run targeted rewrites.

5. **Export**
   Pick a template and download a finished `.docx` resume.

## Architecture

```text
React + Vite frontend
        |
        v
FastAPI API service
        |
        v
Queue-backed worker
        |
        v
Object storage for uploads, resume JSON, outputs, and job state
```

### Frontend

The frontend lives in `client/` and is a React 19 + TypeScript + Vite app. It includes:

- Landing page and authenticated app shell.
- Step-based resume generation flow.
- AI provider and template configuration.
- Resume ingestion, review, edit, and export screens.
- Guest session support through local browser storage.
- Optional AWS Cognito sign-in flow.

### Backend

The backend lives in `server/` and is a FastAPI app with a worker process. It includes:

- Upload URL creation.
- AI credential validation.
- Async generation, rewrite, render, and master-resume jobs.
- Job status polling.
- Resume JSON retrieval, deletion, commit, history, and download routes.
- Local file-backed development services.
- Optional AWS S3, SQS, and Cognito adapters.
- `.docx` rendering with `docxtpl`.

### Storage Model

ResumeSync treats JSON as the source of truth:

```text
temp/{session_or_user_id}/...        temporary uploads
users/{user_id}/master/master.json   saved master resume
users/{user_id}/json/{resume_id}.json
users/{user_id}/outputs/{resume_id}.docx
jobs/{job_id}.json                   job state
```

In local development these objects are written under the backend runtime data directory. In AWS mode they are written to S3.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, React Router, Axios, Font Awesome, dnd-kit
- **Backend:** FastAPI, Pydantic, Uvicorn, LiteLLM, python-docx, pypdf, docxtpl
- **Local services:** file-backed object storage, queue, and job state
- **Cloud-ready services:** AWS S3, SQS, Cognito, ECS Fargate
- **Output format:** `.docx`

## Repository Layout

```text
.
+-- client/                 React/Vite frontend
|   +-- public/             Template previews and landing-page images
|   +-- src/                Pages, components, API client, contexts, types
+-- server/                 FastAPI backend and worker
|   +-- app/api/            API routes and dependencies
|   +-- app/core/           Settings and shared exceptions
|   +-- app/domain/         Storage key helpers
|   +-- app/models/         Pydantic models
|   +-- app/prompts/        Prompt templates
|   +-- app/services/       Local/AWS adapters, LLM logic, renderer
|   +-- app/static/         Resume `.docx` templates
|   +-- app/worker/         Queue processor and runner
|   +-- ecs/                ECS task definitions and IAM policy examples
+-- server/design.md        Backend architecture notes
+-- README.md               Project overview
```

## Local Development

### Prerequisites

- Node.js and npm
- Python 3.11+
- An API key for one supported AI provider

### Run the backend API

From `server/`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --app-dir .
```

The API runs at `http://localhost:8000`.

### Run the worker

In a second terminal from `server/`:

```bash
.venv\Scripts\activate
python -m app.worker.runner
```

The worker processes queued generation, rewrite, render, and master-resume jobs.

### Run the frontend

From `client/`:

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

Create `client/.env` with:

```text
VITE_API_BASE_URL=http://localhost:8000
```

Cognito values are only needed when testing sign-in:

```text
VITE_COGNITO_REGION=
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_DOMAIN=
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_COGNITO_LOGOUT_URI=http://localhost:5173
```

## Backend Configuration

Backend settings use the `RESUMESYNC_` prefix and can be placed in `server/.env`.

Common local settings:

```text
RESUMESYNC_ENV=development
RESUMESYNC_USE_AWS_SERVICES=false
RESUMESYNC_DATA_ROOT=.runtime
RESUMESYNC_POLL_INTERVAL_SECONDS=2
```

AWS-oriented settings:

```text
RESUMESYNC_USE_AWS_SERVICES=true
RESUMESYNC_AWS_REGION=us-east-1
RESUMESYNC_STORAGE_BUCKET=
RESUMESYNC_QUEUE_NAME=resumesync-jobs
RESUMESYNC_QUEUE_URL=
RESUMESYNC_COGNITO_USER_POOL_ID=
RESUMESYNC_COGNITO_REGION=
RESUMESYNC_COGNITO_APP_CLIENT_ID=
```

## Supported AI Providers

ResumeSync currently accepts these provider names:

- `openai`
- `anthropic`
- `gemini` or `google`
- `bedrock` or `aws`

The client sends provider, model, and API key through request headers:

```text
X-AI-Provider
X-AI-Model
X-AI-API-Key
```

The API validates credentials before upload, generation, rewrite, and master-resume workflows.

## API Highlights

- `GET /health` - service health check
- `POST /ai/validate-key` - validate model provider credentials
- `POST /upload-url` - create an upload target for a resume source file
- `POST /jobs` - create a resume generation job
- `GET /jobs/{job_id}` - poll job state
- `GET /resume/{resume_id}` - fetch a resume JSON document
- `GET /resume-by-key` - fetch a resume JSON document by storage key
- `POST /resume/{resume_id}/commit` - save edited resume JSON
- `POST /resume/{resume_id}/render` - create a render job
- `GET /resume/{resume_id}/download` - render and stream a `.docx`
- `POST /resume/{resume_id}/rewrite` - queue targeted rewrites
- `POST /rewrite/preview` - preview a rewritten text snippet
- `POST /master-resume` - parse and save a master resume
- `GET /master-resume` - fetch the saved master resume
- `GET /resumes/history` - list generated resume history
- `GET /templates` - list bundled templates
- `GET /templates/{template_name}` - download a template

## Templates

The backend includes three `.docx` templates:

- `modern`
- `executive`
- `professional`

Template files live in `server/app/static/templates/`. Preview images live in `client/public/`.

## Deployment Notes

The backend includes a Dockerfile and ECS Fargate task definition examples for separate API and worker services. The recommended deployment shape is:

1. Build one backend image.
2. Push it to Amazon ECR.
3. Run the API service behind an Application Load Balancer.
4. Run the worker service from the same image with `python -m app.worker.runner`.
5. Use S3 for object storage and SQS for job dispatch.
6. Use Cognito for authenticated user storage and history.

See `server/ecs/README.md` and `server/design.md` for more deployment detail.

## Development Status

ResumeSync is an active project. The main app flow, backend routes, worker scaffold, LLM parser/tailor, local adapters, templates, and AWS deployment scaffolding are present. Before production use, review provider model allowlists, cloud IAM policies, lifecycle rules, observability, error handling, and any privacy/compliance requirements for resume data.

## License

This project is licensed under the Apache License 2.0. See `LICENSE` for details.
