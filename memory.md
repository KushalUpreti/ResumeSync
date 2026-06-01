# ResumeSync Project Memory

## High-Level Architecture
- **Client**: React + TypeScript + Vite (`client/src`). State managed via `WorkspaceContext`.
  - Pipeline: Ingest -> Config -> Review -> Export
- **Server**: FastAPI + Python (`server/app`). S3/Local object storage & SQS/Local queueing.
  - LLM Integration: `litellm` (Gemini, OpenAI, Anthropic).
  - Document Engine: `docxtpl` for `.docx` generation.

## Current Project State (End-to-End Pipeline Works)
1. **Ingestion**: Supports uploading a master resume, writing notes, or selecting from previous history (`GET /resumes/history`).
2. **Configuration**: Target role, company, and tailoring mode selection. AI key validation preflight gate (`POST /ai/validate-key`).
3. **Review**: Features inline editing of summary, experience roles, companies, and individual bullets. Supports AI rewrite with undo capability. Contact fields (Name, Email, Phone, Links) added with fallback placeholders.
4. **Export**: Sync download endpoint (`GET /resume/{resume_id}/download`) populates the chosen `.docx` template and streams the file to the browser. Export UI shows template thumbnails (`template.png`).

## Important Backend Behaviors
- `source_type=previous` reuses existing JSON key.
- Provider fallback hierarchy defaults to free-tier friendly models (`gemini-1.5-flash`, `gpt-4o-mini`, `claude-3-5-haiku`).
- `WorkspaceContext` uses `generatedResumeId` to track the active resume in the pipeline.

## Pending Implementation Plan (Next Steps)
1. **Education Section**: Add `EducationEntry` to `ResumeDocument`, update LLM prompts, add to Review UI, and pass to docx renderer.
2. **Resume Naming**: Add `title` field to resumes to display in the Ingestion history rather than relying on summary snippets.
3. **Template Updates**: Update static `.docx` templates to iterate over and render the new Education fields.
4. **Codebase Hardening**: Add type checking (`pyright`) and basic API test coverage.

## Fast File Index
- **Frontend**: `IngestionStep.tsx`, `ReviewStep.tsx`, `ExportStep.tsx`, `ResumeSheet.tsx`, `api/resumeSync.ts`, `WorkspaceContext.tsx`
- **Backend**: `routes.py`, `models/resume.py`, `models/jobs.py`, `services/llm_adapters.py`, `services/document_engine.py`
