# ResumeSync Project Memory

## Project Overview

ResumeSync is an AI-assisted resume workflow application. The product helps a user import resume content, configure a target role, review AI-tailored output, and export a polished resume document.

The app is split into:
- **Client**: React + TypeScript + Vite in `client/`
- **Server**: FastAPI + Python in `server/`

## Current Architecture

### Client

- React 19 + TypeScript + Vite.
- Primary app shell lives in `client/src/App.tsx`.
- Global styling is in `client/src/index.css`; small shell/layout styles are in `client/src/App.css`.
- Auth state is managed through `AuthContext`.
- Resume workspace state is managed through `WorkspaceContext`.
- Main workflow route is `/process`.
- Main workflow pages/components include:
  - `client/src/pages/IngestionStep.tsx`
  - `client/src/pages/ConfigStep.tsx`
  - `client/src/pages/ReviewStep.tsx`
  - `client/src/pages/ExportStep.tsx`
  - `client/src/components/ResumeSheet.tsx`
  - `client/src/context/WorkspaceContext.tsx`
  - `client/src/api/resumeSync.ts`

### Server

- FastAPI application in `server/app`.
- Main API routing is in `server/app/api/routes.py`.
- Resume/job models live under `server/app/models`.
- LLM behavior is handled through `server/app/services/llm_adapters.py`.
- Document generation is handled through `server/app/services/document_engine.py`.
- Static `.docx` templates live in `server/app/static/templates`.

## End-to-End Workflow State

The core product workflow is in place:

1. **Ingestion**
   - User can upload resume material, write notes, or use previous resume history.
   - Resume history is available through the backend.

2. **Configuration**
   - User configures target role, company, provider/model settings, and tailoring mode.
   - AI key validation exists as a preflight step.

3. **Review**
   - User can review generated resume content.
   - Inline edits are supported for summary, experience, roles, companies, and bullets.
   - AI rewrite flows exist with undo capability.
   - Contact fields have fallback handling.

4. **Export**
   - User can choose a template and export a `.docx`.
   - Backend streams generated documents to the browser.

## Landing Page Work Completed

The old prototype page and prototype route were removed earlier. The landing page has since been rebuilt as the public-facing homepage.

Current landing page files:
- `client/src/pages/LandingPage.tsx`
- `client/src/index.css`
- `client/public/landing-review-mockup.png`

### Landing Page Current State

- Uses the same project font stack and color tokens as the rest of the app:
  - `Inter, "Segoe UI", Arial, sans-serif`
  - existing surface/background/primary/outline tokens
- Copy has been cleaned up to avoid fake protocol/system language.
- Layout is compact and app-aligned rather than oversized.
- Sections include:
  - Hero with real product mockup screenshot
  - Core feature cards
  - Workflow rail
  - Workspace/reliability section
  - Final CTA

### Landing Page Interactions Added

The landing page now includes subtle motion/interactions:

- Scroll reveal animations via `IntersectionObserver`
- Ambient particle canvas background
- Subtle scanline overlay
- Real hero mockup with gentle float/sheen/hover movement
- Feature card hover inversion and sheen
- Workflow rail with animated progress signal
- Workflow step hover behavior:
  - border highlight
  - number box inversion
  - direction arrows between steps
  - mobile direction arrows switch downward
- Workspace section contains the animated dashboard-style component moved from the hero
- CTA has a soft ambient glow
- Reduced-motion support is included for animation-heavy effects

### Landing Page Notes

- The real hero image comes from the local design screenshot:
  - source: `client/design/review_dashboard_full_screen_diff/screen.png`
  - served asset: `client/public/landing-review-mockup.png`
- The previous cursor halo experiment was removed.
- Horizontal scrollbar issue was fixed by removing `100vw` negative margin math and using a safe `--landing-gutter`.
- Header was simplified into a responsive two-column layout:
  - brand on the left
  - actions on the right
  - status badge hidden on mobile
  - login hidden on very small screens
  - user profile text truncates when needed

## Current Working Tree Notes

At the time this memory was rewritten, the active modified/untracked files were:
- `client/src/index.css`
- `client/src/pages/LandingPage.tsx`
- `client/public/landing-review-mockup.png`

## Verification Status

Recent client builds have passed with:

```powershell
npm.cmd run build
```

The sandbox often blocks TypeScript from writing `.tsbuildinfo` files under `client/node_modules/.tmp`; rerunning the same build with approved permissions succeeds.

Vite still reports the existing chunk-size warning for the main JS bundle. This is not new from the landing page work.

## Known Follow-Ups

- Review the landing page in a real browser after any final visual tweaks.
- Consider code splitting if the Vite chunk-size warning becomes a priority.
- Continue product UI polish across non-landing workflow screens as needed.
- Backend hardening and test coverage are still useful future work.
