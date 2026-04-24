# 🚀 ResumeSync AI — Final Backend Architecture (Definitive Design)

## 1. Purpose

This document defines the **complete, unambiguous backend architecture** for ResumeSync AI.

It incorporates:

* Async processing (SQS workers)
* Direct file handling (S3 pre-signed URLs)
* Real-time editing (FastAPI direct calls)
* Persistent state (structured JSON as source of truth)

---

## 2. Core Architectural Principle

> **The system operates on structured JSON — NOT `.docx` files.**

* `.docx` = final output only
* JSON = source of truth
* All AI operations = transformations on JSON

---

## 3. Technology Stack

* API Layer: FastAPI (Docker on ECS Fargate)
* Worker Layer: Python workers (Docker on ECS Fargate)
* Queue: Amazon SQS
* Storage: Amazon S3
* Auth: AWS Cognito

---

## 4. High-Level Architecture

```text
Frontend (React)
   ↓
FastAPI (API Service)
   ↓
SQS Queue
   ↓
Worker Service (AI + Processing)
   ↓
S3 (Storage)
```

---

## 5. Services (Strict Separation)

### 5.1 API Service (FastAPI)

**Responsibilities ONLY:**

* Authentication / session handling
* Generate pre-signed S3 URLs
* Accept job requests
* Push jobs to SQS
* Provide job status (via S3 job state files)
* Handle quick AI rewrites (non-persistent)

**Must NEVER:**

* Process files
* Call heavy AI workflows
* Render documents

---

### 5.2 Worker Service

**Responsibilities:**

* Poll SQS
* Execute all AI workflows
* Transform and validate JSON
* Render `.docx`
* Upload outputs to S3
* Update job state files in S3

---

## 6. Storage Design (S3)

### 6.1 Bucket Structure

```text
/temp/{session_id}/{upload_id}.docx
/users/{user_id}/master/master.json
/users/{user_id}/json/{resume_id}.json
/users/{user_id}/outputs/{resume_id}.docx
/jobs/{job_id}.json
```

---

### 6.2 Lifecycle Rules

* `/temp/` → delete after 24 hours
* `/jobs/` → delete after 7 days
* `/users/` → persistent

---

### 6.3 Long-Term Files Per Resume

Only two files persist permanently per generated resume:

```text
/users/{user_id}/json/{resume_id}.json       ← source of truth
/users/{user_id}/outputs/{resume_id}.docx    ← final rendered output
```

The temp upload (`/temp/`) is deleted after 24 hours. Raw input `.docx` files are deleted by the worker after a successful generate job. Job state files (`/jobs/`) expire after 7 days.

---

## 7. Data Model (Source of Truth)

### Resume JSON Schema (simplified)

```json
{
  "resume_id": "uuid",
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "bullets": ["string"]
    }
  ],
  "skills": ["string"]
}
```

---

## 8. Job Types (SQS)

All background work is driven by job messages.

### 8.1 Generate Resume Job

```json
{
  "job_type": "generate",
  "mode": "polisher | sniper",
  "source_type": "new_upload | master | previous",
  "source_json_key": "... | null",
  "input_s3_key": "... | null",
  "output_json_key": "...",
  "template_id": "...",
  "user_id": "... | null",
  "session_id": "... | null"
}
```

* `source_type: new_upload` → `input_s3_key` is set, worker parses `.docx` into JSON first
* `source_type: master` → worker copies `/users/{user_id}/master/master.json` as starting JSON
* `source_type: previous` → worker loads existing `/users/{user_id}/json/{resume_id}.json` directly

All three source types then run the same AI tailoring pipeline and produce a new `resume_id` with its own JSON and output files.

---

### 8.2 Rewrite Job

```json
{
  "job_type": "rewrite",
  "resume_id": "...",
  "targets": [
    {
      "path": "experience[0].bullets[1]",
      "instruction": "make more impactful"
    }
  ]
}
```

---

### 8.3 Render Job

```json
{
  "job_type": "render",
  "resume_id": "...",
  "template_id": "..."
}
```

---

## 9. Job State Tracking

Job state is written directly to S3 as JSON files under `/jobs/{job_id}.json`.

### Job State Schema

```json
{
  "job_id": "uuid",
  "status": "pending | processing | complete | failed",
  "output_s3_key": "string | null",
  "error": "string | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### How It Works

* **On job creation:** API writes initial state (`pending`) to `/jobs/{job_id}.json`
* **During processing:** Worker updates state to `processing`
* **On completion/failure:** Worker writes final state with `output_s3_key` or `error`
* **Frontend polling:** `GET /jobs/{job_id}` → API reads `/jobs/{job_id}.json` from S3 and returns it

> No Redis or external cache required. S3 read latency is acceptable for polling intervals of 2–5 seconds.

---

## 10. End-to-End Workflows

---

### 10.1 Resume Source Selection

Before starting a generate job, the frontend prompts the user to pick a source:

| Source | Description |
|---|---|
| `new_upload` | User uploads a fresh `.docx` |
| `master` | Use the master resume saved in account settings |
| `previous` | Use a previously generated resume's existing JSON |

All three sources converge at the same AI tailoring pipeline and produce a new `resume_id`.

---

### 10.2 New Upload + Generate

```text
1. Frontend → FastAPI → request upload URL
2. FastAPI → returns pre-signed S3 URL (/temp/)
3. Frontend → uploads directly to S3
4. Frontend → POST /jobs (generate, source_type: new_upload)
5. FastAPI → writes job state (pending) to /jobs/{job_id}.json
6. FastAPI → pushes job to SQS
7. Worker:
    - download .docx from /temp/
    - extract text → produce base JSON
    - delete input .docx from S3
    - run AI tailoring on JSON
    - store output JSON to /users/{user_id}/json/{resume_id}.json
    - update job state to complete
8. Frontend polls GET /jobs/{job_id} until complete
```

---

### 10.3 Master Resume + Generate

```text
1. Frontend → POST /jobs (generate, source_type: master)
2. FastAPI → writes job state (pending), pushes to SQS
3. Worker:
    - copy /users/{user_id}/master/master.json as base JSON
    - run AI tailoring on JSON
    - store output to /users/{user_id}/json/{resume_id}.json
    - update job state to complete
4. Frontend polls GET /jobs/{job_id} until complete
```

---

### 10.4 Previous Resume + Generate

```text
1. Frontend → POST /jobs (generate, source_type: previous, source_json_key: ...)
2. FastAPI → writes job state (pending), pushes to SQS
3. Worker:
    - load existing /users/{user_id}/json/{resume_id}.json as base JSON
    - run AI tailoring on JSON
    - store output to /users/{user_id}/json/{new_resume_id}.json
    - update job state to complete
4. Frontend polls GET /jobs/{job_id} until complete
```

---

### 10.5 Master Resume Upload (Account Settings)

```text
1. Frontend → FastAPI → request upload URL
2. FastAPI → returns pre-signed S3 URL (/temp/)
3. Frontend → uploads .docx to S3
4. Frontend → POST /master-resume
5. FastAPI → pushes parse job to SQS
6. Worker:
    - download .docx from /temp/
    - extract text → produce JSON
    - delete input .docx
    - store to /users/{user_id}/master/master.json (overwrite if exists)
    - update job state to complete
```

---

### 10.6 Quick Rewrite (Real-Time, No Persistence)

```text
Frontend → FastAPI → LLM → return rewritten text
```

* Used for UI editing only
* No SQS
* No storage

---

### 10.7 Commit Changes (Auto-Save on Interval)

The frontend sends the full updated JSON every 30 seconds if changes exist. The backend does not track dirty state — it simply accepts and persists whatever JSON it receives.

```text
POST /resume/{id}/commit (full JSON)
   ↓
FastAPI → SQS
   ↓
Worker validates + saves JSON to /users/{user_id}/json/{resume_id}.json
```

---

### 10.8 Export Resume

```text
Frontend → FastAPI → POST /render
   ↓
FastAPI → SQS
   ↓
Worker:
   - load JSON
   - render via docxtpl
   - upload .docx to /users/{user_id}/outputs/{resume_id}.docx
   - update job state to complete
```

---

## 11. API Endpoints

### Upload URL

```http
POST /upload-url
```

---

### Create Job

```http
POST /jobs
```

---

### Job Status

```http
GET /jobs/{job_id}
```

Reads `/jobs/{job_id}.json` from S3 and returns current state.

---

### Quick Rewrite

```http
POST /rewrite/preview
```

---

### Commit Resume

```http
POST /resume/{id}/commit
```

---

### Render Resume

```http
POST /resume/{id}/render
```

---

### Upload Master Resume

```http
POST /master-resume
```

Triggers a parse job that stores the result to `/users/{user_id}/master/master.json`. Overwrites any existing master resume.

---

### Get Master Resume

```http
GET /master-resume
```

Returns the current master resume JSON if one exists.

---

## 12. Worker Processing Logic

```text
while true:
  poll SQS
  for each message:
    parse job_type
    update job state → processing (S3)

    if generate:
      if source_type == new_upload:
        download .docx → extract text → produce base JSON
        delete input .docx from S3
      elif source_type == master:
        copy /users/{user_id}/master/master.json as base JSON
      elif source_type == previous:
        load existing /users/{user_id}/json/{resume_id}.json as base JSON

      run AI tailoring on base JSON
      write output to /users/{user_id}/json/{new_resume_id}.json

    if parse_master:
      download .docx → extract text → produce JSON
      delete input .docx from S3
      write to /users/{user_id}/master/master.json

    if rewrite:
      update JSON fields

    if render:
      generate docx
      upload to /users/{user_id}/outputs/{resume_id}.docx

    update job state → complete | failed (S3)
    delete message from SQS
```

---

## 13. Security Model

* Pre-signed URLs only
* No public S3 access
* Strict key validation
* Anonymous users limited to `/temp/`
* API keys (BYOK) never stored

---

## 14. Scaling Strategy

### API Service

* Scale on request load

### Worker Service

* Scale based on SQS queue depth

---

## 15. Failure Handling

* SQS retry policy
* Dead Letter Queue (DLQ)
* Worker must:

  * catch all errors
  * write failed state to `/jobs/{job_id}.json`
  * mark job as failed before exiting

---

## 16. Critical Rules (Non-Negotiable)

1. `.docx` is NEVER edited directly
2. JSON is ALWAYS the source of truth
3. All heavy work goes through SQS workers
4. FastAPI remains stateless
5. Anonymous data must expire
6. Job state is stored in S3 — no external cache layer
7. Raw input `.docx` files are deleted by the worker after successful parsing
8. All three resume sources (new upload, master, previous) produce a new `resume_id` — nothing is overwritten in place

---

## 17. Final Mental Model

* FastAPI = Controller
* SQS = Queue
* Worker = Engine
* S3 = Storage + Job State
* JSON = Truth
* `.docx` = View

---

## ✅ Final Summary

This system guarantees:

* Scalability (queue-based processing)
* Performance (no blocking API calls)
* Consistency (JSON-first design)
* Flexibility (multi-step AI workflows, three resume sources)
* Simplicity (S3-backed job state, no Redis dependency)

---

## 🔥 Implementation Order

1. S3 bucket + lifecycle rules
2. FastAPI upload endpoint
3. SQS queue setup
4. Worker service loop
5. JSON schema + validation
6. Job state read/write via S3
7. End-to-end generate flow (new upload)
8. Master resume upload + parse flow
9. Previous resume source flow
10. Rewrite + commit flow
11. Render pipeline
