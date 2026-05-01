import { useEffect, useRef, useState, type DragEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleInfo,
  faFileArrowUp,
  faFileLines,
  faSpinner,
  faTimeline,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from 'react-router-dom'
import { getMasterResume, requestUploadUrl, uploadFileToPresignedUrl, uploadMasterResume, waitForJob } from '../api/resumeSync'
import SectionCard from '../components/SectionCard'
import { useAuth } from '../context/useAuth'
import { useWorkspace } from '../context/useWorkspace'
import { useNotification } from '../context/useNotification'
import { flowSteps, mockDraftResume, mockMasterResume } from '../data/mockData'

type IngestionStepProps = {
  onNext: () => void
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

function IngestionStep({ onNext }: IngestionStepProps) {
  const { addNotification } = useNotification()
  const location = useLocation()
  const { auth } = useAuth()
  const { masterResume, setDraftResume, setMasterResume } = useWorkspace()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedMode, setSelectedMode] = useState('general')
  const [details, setDetails] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [statusMessage, setStatusMessage] = useState('Upload your master resume to unlock authenticated backend flows.')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      return
    }

    void (async () => {
      try {
        const response = await getMasterResume()
        console.log(response)
        if (response.exists && response.document) {
          setMasterResume(response.document)
          setDraftResume(response.document)
          setStatusMessage('Loaded your existing master resume from the backend.')
        } else {
          setMasterResume(null)
          setDraftResume(null)
          setStatusMessage('Signed in successfully. Upload a master resume to start tailoring.')
        }
      } catch (error) {
        setMasterResume(null)
        setDraftResume(null)
        addNotification({
          type: 'error',
          message: 'Connection Failed',
          description: 'We couldn\'t fetch your stored resume. Please upload a file to continue.'
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status])

  function handleFilePick(fileList: FileList | null) {
    const nextFile = fileList?.[0]
    if (!nextFile) {
      return
    }

    setSelectedFile(nextFile)
    setSelectedFileName(nextFile.name)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragActive(false)
    handleFilePick(event.dataTransfer.files)
  }

  const selectedModeData = savedModes.find((mode) => mode.value === selectedMode)

  async function handleProceed() {
    // If they already have a master resume and didn't select a new one, just proceed.
    if (!selectedFile && masterResume) {
      onNext()
      return
    }

    if (!selectedFile) {
      addNotification({
        type: 'warning',
        message: 'No File Selected',
        description: 'Choose a DOCX, PDF, or TXT file before proceeding to the configuration step.'
      })
      return
    }

    setIsSaving(true)
    setStatusMessage('Requesting a secure upload URL from the backend...')

    try {
      const upload = await requestUploadUrl({
        upload_type: 'master_resume',
        filename: selectedFile.name,
        content_type: selectedFile.type || 'application/octet-stream',
      })

      await uploadFileToPresignedUrl(upload.upload_url, selectedFile, upload.headers)
      setStatusMessage('Upload complete. Parsing your master resume...')

      const parseJob = await uploadMasterResume(upload.object_key)
      const job = await waitForJob(parseJob.job_id)
      if (job.status === 'failed') {
        throw new Error(job.error || 'The master resume parse job failed.')
      }

      const master = await getMasterResume()
      if (!master.exists || !master.document) {
        throw new Error('The worker completed, but no master resume JSON was returned.')
      }

      setMasterResume(master.document)
      setDraftResume(master.document)
      setStatusMessage('Success! Moving to configuration.')
      onNext();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unable to upload the master resume.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-stack">


      <section className="page-intro">
        <h1 className="page-title page-title--hero">Knowledge Ingestion</h1>
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
            </div>
            <div className="vault-container">
              <textarea
                className="text-area vault-input"
                placeholder="e.g., Led the migration of legacy CRM to cloud-based architecture. Managed a team of 12 engineers. Achieved 20% reduction in latency..."
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
              <button className="vault-action" type="button">
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
            <p className="section-label">Selected for Analysis</p>
            <div className="queue-list">
              {selectedFile ? (
                <article className="queue-item">
                  <div className="queue-item__meta">
                    <div className="queue-item__icon">
                      <FontAwesomeIcon icon={faFileLines} />
                    </div>
                    <div>
                      <h3>{selectedFile.name}</h3>
                      <p>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB / Ready</p>
                    </div>
                  </div>
                  <div className="queue-item__status">
                    <button className="queue-item__remove" onClick={() => setSelectedFile(null)} type="button">
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                </article>
              ) : masterResume ? (
                <article className="queue-item" style={{ borderColor: 'var(--color-success)', background: 'rgba(15, 157, 108, 0.05)' }}>
                  <div className="queue-item__meta">
                    <div className="queue-item__icon" style={{ color: 'var(--color-success)' }}>
                      <FontAwesomeIcon icon={faFileLines} />
                    </div>
                    <div>
                      <h3>Stored Master Resume</h3>
                      <p>Loaded from your account / Ready</p>
                    </div>
                  </div>
                </article>
              ) : (
                <p className="section-copy text-muted">No file selected yet.</p>
              )}
            </div>
          </div>

          <div className="auth-note">
            {masterResume && !selectedFile
              ? 'Upload a new file above if you wish to overwrite your existing master resume.'
              : statusMessage}
          </div>
        </SectionCard>
      </div>

      <section className="bottom-toolbar">
        <div className="bottom-toolbar__summary">
          <div className="bottom-toolbar__icon">AI</div>
          <div>
            <strong>Engine: {localStorage.getItem('ai_provider_display') || 'Not Selected'}</strong>
            <p>Ready for high-precision tailoring</p>
          </div>
        </div>
        <div className="bottom-toolbar__actions">
          <button className="button button--ghost" onClick={() => setSelectedFile(null)} type="button">
            Cancel
          </button>
          <button
            className="button button--primary"
            disabled={isSaving}
            onClick={() => void handleProceed()}
            type="button"
          >
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : null}
            Proceed to Review &rarr;
          </button>
        </div>
      </section>
    </div>
  )
}

export default IngestionStep
