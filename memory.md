# ResumeSync Memory Handoff

## Project State (as of 2026-05-26)
- App is a client/server resume tailoring pipeline with ingestion, config, review, export.
- Major UX and pipeline fixes were completed across client and server.
- Client currently builds/lints clean (`npm.cmd run lint`, `npm.cmd run build`).
- Server-side runtime checks were limited in this environment (no Python runtime available in shell), but server code was patched in multiple areas.

---

## High-Level Architecture
- **Client**: React + TypeScript (`client/src`)
  - Step flow: Ingest -> Config -> Review -> Export
  - API layer: `client/src/api/resumeSync.ts`
  - Global pipeline state: `client/src/context/WorkspaceContext.tsx`
- **Server**: FastAPI + job queue/object store abstractions (`server/app`)
  - Routes: `server/app/api/routes.py`
  - Job worker: `server/app/worker/processor.py`
  - LLM parser/tailor adapters: `server/app/services/llm_adapters.py`
  - Models: `server/app/models/*.py`
  - Storage key conventions: `server/app/domain/storage_keys.py`

---

## Key Features Implemented

## 1) Review Page UX and Editing
- Added inline editing for:
  - Professional summary
  - Experience role title
  - Experience company
  - Individual experience bullets
- Bullet editing now syncs live to draft state; rewrite uses current field value.
- Added rewrite hover behavior and undo support (including previous work in this thread for bullets and skills).
- Added smooth editor behavior:
  - Prevented focus-drop regression during typing
  - Auto-growing multiline text areas (no scrollbar for summary/bullets)
  - Reduced flicker/jumping
- Role/company layout constrained to avoid collision; wraps long text.

### Main files
- `client/src/components/ResumeSheet.tsx`
- `client/src/pages/ReviewStep.tsx`
- `client/src/index.css`

---

## 2) Ingestion Flow Loading + Navigation
- Removed jarring “old resume loads then new appears later” behavior.
- Ingestion now waits for generate+fetch to complete before navigating to Review.
- Added full-screen loading backdrop while preparing review data.

### Main files
- `client/src/pages/IngestionStep.tsx`
- `client/src/index.css`

---

## 3) Resume History Source Selection on Ingest
- Logged-in users can choose from previously processed resumes as ingestion source.
- Ingest UI shows up to 4 recent records inline.
- If >4, “Load more” opens modal with full history.
- Selecting a history record sets source type to `previous`.

### Server additions
- New endpoint: `GET /resumes/history`
- Added object store key listing support to interfaces/adapters.

### Main files
- Server:
  - `server/app/api/routes.py`
  - `server/app/services/interfaces.py`
  - `server/app/services/local_adapters.py`
  - `server/app/services/aws_adapters.py`
  - `server/app/models/resume.py` (history response types)
- Client:
  - `client/src/pages/IngestionStep.tsx`
  - `client/src/api/resumeSync.ts`
  - `client/src/types/api.ts`
  - `client/src/index.css`

---

## 4) Duplicate JSON Object Avoidance / Source Exclusivity
- Fixed generate flow so **previous resume source reuses existing JSON key** instead of always creating a new one.
- Added ownership validation for `source_json_key` against current user/session prefix.
- UI source cancel/reset behavior improved so only one source path is active.

### Main files
- `server/app/api/routes.py`
- `client/src/pages/IngestionStep.tsx`

---

## 5) Contact Fields + Placeholders Across Pipeline
- Added canonical contact fields to resume model:
  - `full_name`, `email`, `phone`, `links`
- Added model-level fallback placeholders if missing from source:
  - Name: `Your Name`
  - Email: `you@example.com`
  - Phone: `(555) 555-5555`
  - Link: `linkedin.com/in/your-profile`
- Updated parser/tailor prompts and mapping to carry these fields.
- Updated doc renderer context/fallback DOCX output to include contact line.
- Added contact display section in review preview.

### Main files
- Server:
  - `server/app/models/resume.py`
  - `server/app/services/llm_adapters.py`
  - `server/app/services/local_adapters.py`
  - `server/app/services/document_engine.py`
  - `server/app/worker/processor.py` (typing import fix)
- Client:
  - `client/src/types/resume.ts`
  - `client/src/components/ResumeSheet.tsx`
  - `client/src/index.css`

---

## 6) AI Key Validation Gate Before Storage/Processing
- Added server endpoint: `POST /ai/validate-key`
- Enforced AI credential validation before ingestion writes/queue starts:
  - `POST /upload-url`
  - `POST /jobs` (generate)
  - `POST /master-resume`
- Client now calls explicit preflight validation in Ingestion before proceeding.
- Improved error messaging so frontend surfaces backend `detail` text (not generic axios string).

### Main files
- Server:
  - `server/app/api/routes.py`
  - `server/app/models/jobs.py` (validate response type)
- Client:
  - `client/src/api/client.ts` (API error detail helper)
  - `client/src/api/resumeSync.ts`
  - `client/src/types/api.ts`
  - `client/src/pages/IngestionStep.tsx`

---

## 7) Provider/Model Fallback Alignment
- User requested fallbacks are OK if free-tier-friendly.
- Updated backend defaults:
  - Gemini default fallback now `gemini/gemini-1.5-flash` (instead of `1.5-pro`).
  - OpenAI default (when explicit provider is openai): `openai/gpt-4o-mini`.
  - Anthropic default: `anthropic/claude-3-5-haiku-20241022`.
- Validation unknown-provider fallback now points to Gemini Flash.

### Main files
- `server/app/api/routes.py`
- `server/app/services/llm_adapters.py`

---

## 8) Homepage Visual Refinement + Particle FX
- Homepage typography and spacing were tuned to feel less aggressive and more minimal while preserving theme/structure.
- Added cursor-reactive particle layer on Landing page:
  - Star-like pulse particles around mouse pointer
  - Non-interactive overlay (`pointer-events: none`)
  - Refined to be subtle and minimalistic:
    - Lower spawn rate (40ms throttle) and count (2 particles per spawn)
    - Tighter dispersion radius around the cursor (30px)
    - Smaller particle sizes (1.2px - 3px)
    - Shorter particle lifespan (1000ms animation, 1100ms removal)
    - Subtle accent-blue/cyan glow color scheme with reduced scale transition (1.3x max scale)

### Main files
- `client/src/pages/LandingPage.tsx`
- `client/src/index.css`

---

## Important Current Behaviors
- Ingestion can proceed from exactly one selected source at runtime:
  - New uploaded master resume
  - Existing stored master resume
  - Previously processed resume JSON
- For `source_type=previous`, generation writes in-place to existing JSON key (no duplicate key creation).
- AI credential preflight happens before ingestion upload/job actions.
- Review page supports direct inline editing + rewrite/undo interactions with smoother UI.

---

## Known Risks / Follow-Up Checks
- Server-side tests/compile were not executed here due missing Python runtime in this shell environment.
- AI key validation currently makes a real provider call; this is intentional but can fail for:
  - Invalid key
  - Provider rate limiting
  - Provider timeout/outage
- If users continue to see 401/429/503 preflight failures, inspect backend response `detail` and provider config in local storage headers:
  - `X-AI-Provider`
  - `X-AI-Model`
  - `X-AI-API-Key`

---

## Suggested Next Steps for Next Agent
1. Run server test/lint/typing checks in an environment with Python available.
2. Verify `/ai/validate-key` behavior across all supported providers with real keys.
3. End-to-end verify docx templates consume `full_name/email/phone/links` fields (template placeholders may still need updates).
4. Optionally centralize provider/model list so UI and server defaults are sourced from one config.
5. Add automated tests for:
   - source selection exclusivity
   - previous-source key reuse
   - contact placeholder normalization
   - preflight validation gating before upload/job creation

---

## Fast File Index (Most Touched)
- Client
  - `client/src/pages/IngestionStep.tsx`
  - `client/src/pages/ReviewStep.tsx`
  - `client/src/components/ResumeSheet.tsx`
  - `client/src/index.css`
  - `client/src/api/resumeSync.ts`
  - `client/src/api/client.ts`
  - `client/src/types/resume.ts`
  - `client/src/types/api.ts`
- Server
  - `server/app/api/routes.py`
  - `server/app/models/resume.py`
  - `server/app/models/jobs.py`
  - `server/app/services/llm_adapters.py`
  - `server/app/services/document_engine.py`
  - `server/app/services/interfaces.py`
  - `server/app/services/local_adapters.py`
  - `server/app/services/aws_adapters.py`
  - `server/app/worker/processor.py`

---

## 9) Export Pipeline & Document Generation
- Cleaned up the `ExportStep.tsx` UI, centering the layout and adding a right-aligned export action bar.
- Replaced mock HTML template previews with real thumbnail images (`template.png`).
- Created `/templates` and `/templates/{name}` routes to fetch list of available `.docx` templates.
- Added a synchronous download endpoint `GET /resume/{resume_id}/download` to actually fill the chosen `.docx` template using `DocxtplDocumentRenderer` and stream it back to the client.
- Export button now triggers the actual download pipeline, returning the final populated document to the user.

### Main files
- Server:
  - `server/app/api/routes.py`
  - `server/app/services/document_engine.py`
- Client:
  - `client/src/pages/ExportStep.tsx`
  - `client/src/api/resumeSync.ts`
