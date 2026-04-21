import { type DragEvent, type RefObject } from 'react'

type Mode = 'polisher' | 'sniper'

type ResumeItem = {
  id: number
  name: string
  updatedAt: string
  status: string
}

type IngestionPageProps = {
  details: string
  dragActive: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  isLoggedIn: boolean
  mode: Mode
  savedResumes: ResumeItem[]
  selectedFile: File | null
  selectedResumeId: number | null
  onDetailsChange: (value: string) => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onDragActiveChange: (isActive: boolean) => void
  onFilePick: (fileList: FileList | null) => void
  onOpenLogin: () => void
  onResumeSelect: (resumeId: number) => void
  onModeSelect: (mode: Mode) => void
}

function IngestionPage({
  details,
  dragActive,
  fileInputRef,
  isLoggedIn,
  mode,
  savedResumes,
  selectedFile,
  selectedResumeId,
  onDetailsChange,
  onDrop,
  onDragActiveChange,
  onFilePick,
  onOpenLogin,
  onResumeSelect,
  onModeSelect,
}: IngestionPageProps) {
  const selectedResume = savedResumes.find((resume) => resume.id === selectedResumeId)

  return (
    <main className="workspace-page">
      <section className="workspace-intro">
        <p className="eyebrow">Ingestion and Targeting</p>
        <h2>Start with a file, then tell the AI how aggressive to be.</h2>
        <p className="workspace-copy">
          Upload a fresh resume or select one from your saved history if you are
          signed in.
        </p>
      </section>

      <section className="workspace-grid">
        <div className="panel">
          <div className="panel__header">
            <h3>Resume source</h3>
            <p>Use drag and drop for a new file or pick an existing draft.</p>
          </div>

          <label
            className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
            onDragEnter={() => onDragActiveChange(true)}
            onDragLeave={() => onDragActiveChange(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".doc,.docx,.pdf"
              onChange={(event) => onFilePick(event.target.files)}
            />
            <strong>Drop your resume here</strong>
            <span>DOC, DOCX, or PDF</span>
            <button
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Browse files
            </button>
          </label>

          <div className="selection-card">
            <h4>Current selection</h4>
            <p>{selectedFile?.name ?? selectedResume?.name ?? 'No file selected yet.'}</p>
          </div>

          {isLoggedIn ? (
            <div className="saved-list">
              <div className="panel__header">
                <h3>Saved resumes</h3>
                <p>Pick one stored in your private resume drive.</p>
              </div>
              {savedResumes.map((resume) => (
                <button
                  key={resume.id}
                  className={`saved-item ${
                    selectedResumeId === resume.id ? 'saved-item--selected' : ''
                  }`}
                  onClick={() => onResumeSelect(resume.id)}
                  type="button"
                >
                  <span>{resume.name}</span>
                  <small>
                    {resume.updatedAt} | {resume.status}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <div className="selection-card selection-card--muted">
              <h4>Saved history</h4>
              <p>Log in to access resumes you have uploaded before.</p>
              <button className="ghost-button" onClick={onOpenLogin} type="button">
                Log in to view saved resumes
              </button>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__header">
            <h3>Targeting mode</h3>
            <p>Choose the level of tailoring you want from the AI.</p>
          </div>

          <div className="mode-grid">
            <button
              className={`mode-card ${mode === 'polisher' ? 'mode-card--selected' : ''}`}
              onClick={() => onModeSelect('polisher')}
              type="button"
            >
              <strong>Polisher</strong>
              <span>Grounded rewrites, clean phrasing, and believable metrics.</span>
            </button>
            <button
              className={`mode-card ${mode === 'sniper' ? 'mode-card--selected' : ''}`}
              onClick={() => onModeSelect('sniper')}
              type="button"
            >
              <strong>Sniper</strong>
              <span>Aggressive job targeting with stronger keyword alignment.</span>
            </button>
          </div>

          <div className="panel__header panel__header--spaced">
            <h3>Additional details</h3>
            <p>Paste a job description, role goals, or notes for tone.</p>
          </div>

          <textarea
            className="details-input"
            placeholder="Paste a job description, must-have keywords, or guidance for the rewrite..."
            value={details}
            onChange={(event) => onDetailsChange(event.target.value)}
          />

          <div className="selection-card">
            <h4>Ready to continue</h4>
            <p>
              Mode: {mode === 'polisher' ? 'Polisher' : 'Sniper'}
              <br />
              Source:{' '}
              {selectedFile?.name ??
                selectedResume?.name ??
                'Choose a file or saved resume'}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export type { Mode, ResumeItem }
export default IngestionPage
