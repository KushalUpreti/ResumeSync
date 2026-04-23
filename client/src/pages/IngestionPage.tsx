import { useRef, useState, type DragEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleInfo,
  faFileArrowUp,
  faFileLines,
  faTimeline,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { Link, useLocation } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import SectionCard from '../components/SectionCard'
import { flowSteps, queuedFiles } from '../data/mockData'

type IngestionPageProps = {
  onOpenLogin: () => void
}

const savedModes = [
  {
    value: 'general',
    label: 'General',
    description: 'General mode analyzes your entire history.',
  },
  {
    value: 'job-targeting',
    label: 'Job-Targeting',
    description: 'Job-Targeting prioritizes relevance for a specific role.',
  },
]

function IngestionPage({ onOpenLogin }: IngestionPageProps) {
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedMode, setSelectedMode] = useState('general')
  const [details, setDetails] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('main_resume_2024_v2.pdf')

  function handleFilePick(fileList: FileList | null) {
    const nextFile = fileList?.[0]
    if (!nextFile) {
      return
    }

    setSelectedFileName(nextFile.name)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragActive(false)
    handleFilePick(event.dataTransfer.files)
  }

  const selectedModeData = savedModes.find((mode) => mode.value === selectedMode)

  return (
    <div className="page-stack">
      <FlowStepper currentPath={location.pathname} steps={flowSteps} />

      <section className="page-intro">
        <p className="eyebrow">Knowledge Ingestion</p>
        <h1 className="page-title">Knowledge Ingestion</h1>
        <p className="page-copy">
          Feed your AI persona with raw professional data for hyper-personalized resume
          generation.
        </p>
      </section>

      <div className="dashboard-grid">
        <div className="stack-column">
          <SectionCard>
            <div className="section-card__header section-card__header--inline">
              <h2 className="section-card__title">Ingestion Mode</h2>
              <span className="info-dot">
                <FontAwesomeIcon icon={faCircleInfo} />
              </span>
            </div>
            <div className="segmented-control" role="tablist" aria-label="Ingestion mode">
              {savedModes.map((mode) => (
                <button
                  className={
                    selectedMode === mode.value
                      ? 'segmented-control__item is-active'
                      : 'segmented-control__item'
                  }
                  key={mode.value}
                  onClick={() => setSelectedMode(mode.value)}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="section-copy">{selectedModeData?.description}</p>
          </SectionCard>

          <SectionCard>
            <div className="section-card__header section-card__header--inline">
              <h2 className="section-card__title">Experience Vault</h2>
              <span className="tag tag--neutral">Markdown Supported</span>
            </div>
            <p className="section-copy">
              Paste unformatted job descriptions, project notes, or raw performance reviews
              here.
            </p>
            <textarea
              className="text-area"
              placeholder="e.g., Led the migration of legacy CRM to cloud-based architecture. Managed a team of 12 engineers. Achieved 20% reduction in latency..."
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
            <div className="text-area__actions">
              <button className="icon-action" type="button">
                <FontAwesomeIcon icon={faWandMagicSparkles} />
              </button>
            </div>
          </SectionCard>
        </div>

        <SectionCard>
          <div className="section-card__header">
            <h2 className="section-card__title">Primary Source Upload</h2>
            <p className="section-copy">
              Upload your latest PDF/DOCX resume for structural analysis.
            </p>
          </div>

          <label
            className={dragActive ? 'upload-panel is-active' : 'upload-panel'}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".doc,.docx,.pdf,.txt"
              onChange={(event) => handleFilePick(event.target.files)}
            />
            <div className="upload-panel__icon">
              <FontAwesomeIcon icon={faFileArrowUp} />
            </div>
            <strong>Drag and drop files</strong>
            <span>Support for PDF, DOCX, and TXT files up to 10MB.</span>
            <button
              className="button button--primary"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Select from Computer
            </button>
          </label>

          <div className="queue-block">
            <p className="section-label">Queued for Analysis</p>
            <div className="queue-list">
              {queuedFiles.map((file) => (
                <article className="queue-item" key={file.id}>
                  <div className="queue-item__meta">
                    <div className="queue-item__icon">
                      <FontAwesomeIcon icon={file.id === 'resume-primary' ? faFileLines : faTimeline} />
                    </div>
                    <div>
                      <h3>{file.id === 'resume-primary' ? selectedFileName : file.name}</h3>
                      <p>{file.meta} / {file.status}</p>
                    </div>
                  </div>
                  <div className="queue-item__status">
                    {file.progress < 100 ? (
                      <div className="progress-bar">
                        <span style={{ width: `${file.progress}%` }} />
                      </div>
                    ) : (
                      <button className="queue-item__remove" type="button">
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <section className="bottom-toolbar">
        <div className="bottom-toolbar__summary">
          <div className="bottom-toolbar__icon">AI</div>
          <div>
            <strong>Engine: ResumeSync-Llama-70b</strong>
            <p>Context depth: 4,000 tokens active</p>
          </div>
        </div>
        <div className="bottom-toolbar__actions">
          <button className="button button--ghost" type="button">
            Cancel
          </button>
          <button className="button button--ghost" onClick={onOpenLogin} type="button">
            Save to Account
          </button>
          <Link className="button button--primary" to="/config">
            Proceed to Configuration
          </Link>
        </div>
      </section>
    </div>
  )
}

export default IngestionPage
