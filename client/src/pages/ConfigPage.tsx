import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBrain,
  faCheckCircle,
  faCirclePlus,
  faEye,
  faEyeSlash,
  faMemory,
  faMicrochip,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createGenerateJob, waitForJob } from '../api/resumeSync'
import FlowStepper from '../components/FlowStepper'
import SectionCard from '../components/SectionCard'
import { useAuth } from '../context/useAuth'
import { useWorkspace } from '../context/useWorkspace'
import { flowSteps, providerCards } from '../data/mockData'
import type { ResumeDocument } from '../types/resume'

const providerIconMap = {
  OpenAI: faBrain,
  Anthropic: faMicrochip,
  'Google Gemini': faMemory,
} as const

function ConfigPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { auth, openAuthModal } = useAuth()
  const {
    masterResume,
    selectedTemplateId,
    setDraftResume,
    setGeneratedResume,
    setLastGenerateJob,
    setTailoringMode,
    setTargetCompany,
    setTargetRole,
    setJobDescription,
    tailoringMode,
    targetCompany,
    targetRole,
    jobDescription,
  } = useWorkspace()
  const [showApiKey, setShowApiKey] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('OpenAI')
  const [selectedModel, setSelectedModel] = useState('gpt-4o (Standard)')
  const [temperature, setTemperature] = useState(0.7)
  const [jobStatus, setJobStatus] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  function deriveResumeIdFromJsonKey(jsonKey: string | null) {
    if (!jsonKey) {
      return null
    }

    const match = jsonKey.match(/\/json\/([^/]+)\.json$/)
    return match?.[1] ?? null
  }

  function buildDraftFromMaster(document: ResumeDocument, resumeId: string) {
    return {
      ...document,
      resume_id: resumeId,
      metadata: {
        ...(document.metadata ?? {}),
        target_role: targetRole,
        target_company: targetCompany,
        job_description: jobDescription,
        selected_provider: selectedProvider,
        selected_model: selectedModel,
      },
    }
  }

  async function handleGenerateDraft() {
    if (auth.status !== 'authenticated') {
      openAuthModal('signIn')
      return
    }

    if (!masterResume) {
      setJobStatus('Upload a master resume first so the backend has a source document to tailor.')
      return
    }

    setIsGenerating(true)
    setJobStatus('Submitting a generate job to the backend...')

    try {
      const job = await createGenerateJob({
        job_type: 'generate',
        mode: tailoringMode,
        source_type: 'master',
        template_id: selectedTemplateId,
        target_role: targetRole || null,
        target_company: targetCompany || null,
        job_description: jobDescription || null,
      })

      const finalJob = await waitForJob(job.job_id)
      setLastGenerateJob(finalJob)
      if (finalJob.status === 'failed') {
        throw new Error(finalJob.error || 'The generation job failed.')
      }

      const generatedResumeId = deriveResumeIdFromJsonKey(finalJob.output_s3_key)
      if (!generatedResumeId) {
        throw new Error('The backend completed the job but did not return a usable resume key.')
      }

      setGeneratedResume(generatedResumeId, finalJob.output_s3_key)
      setDraftResume(buildDraftFromMaster(masterResume, generatedResumeId))
      setJobStatus('Generate job complete. Moving you into review.')
      navigate('/review')
    } catch (error) {
      setJobStatus(error instanceof Error ? error.message : 'Unable to create the generate job.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="page-stack">
      <FlowStepper currentPath={location.pathname} steps={flowSteps} />

      <section className="page-intro">
        <p className="eyebrow">Engine Configuration</p>
        <h1 className="page-title page-title--medium">Engine Configuration</h1>
        <p className="page-copy">
          Select and configure your preferred AI orchestration engine for resume parsing.
        </p>
      </section>

      <div className="dashboard-grid dashboard-grid--config">
        <div className="provider-grid">
          <SectionCard className="provider-card">
            <div className="section-card__header">
              <p className="section-label">Tailoring Mode</p>
            </div>
            <div className="segmented-control" role="tablist" aria-label="Tailoring mode">
              <button
                className={tailoringMode === 'polisher' ? 'segmented-control__item is-active' : 'segmented-control__item'}
                onClick={() => setTailoringMode('polisher')}
                type="button"
              >
                Polisher
              </button>
              <button
                className={tailoringMode === 'sniper' ? 'segmented-control__item is-active' : 'segmented-control__item'}
                onClick={() => setTailoringMode('sniper')}
                type="button"
              >
                Sniper
              </button>
            </div>
            <p className="section-copy">
              The backend generate job is wired today for the two documented tailoring modes.
            </p>
          </SectionCard>

          {providerCards.map((provider) => {
            const isSelected = selectedProvider === provider.name

            return (
              <button
                aria-pressed={isSelected}
                className={isSelected ? 'section-card provider-card is-selected' : 'section-card provider-card'}
                key={provider.name}
                onClick={() => setSelectedProvider(provider.name)}
                type="button"
              >
                <div className="provider-card__top">
                  <div className="provider-card__icon">
                    <FontAwesomeIcon icon={providerIconMap[provider.name as keyof typeof providerIconMap]} />
                  </div>
                  <div>
                    <h3>{provider.name}</h3>
                    <p>{provider.model}</p>
                  </div>
                  {isSelected ? (
                    <span className="provider-card__check">
                      <FontAwesomeIcon icon={faCheckCircle} />
                    </span>
                  ) : null}
                </div>
                <p className="provider-card__copy">{provider.description}</p>
                <div className="tag-row">
                  {provider.badges.map((badge) => (
                    <span className="tag tag--neutral" key={badge}>
                      {badge}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}

          <button className="section-card provider-card provider-card--empty" type="button">
            <div className="provider-card__empty-icon">
              <FontAwesomeIcon icon={faCirclePlus} />
            </div>
            <h3>Custom Provider (BYOK)</h3>
          </button>
        </div>

        <SectionCard className="config-panel">
          <div className="section-card__header">
            <p className="section-label">Configuration Details</p>
          </div>

          <div className="form-stack">
            <label className="field">
              <span>Target Role</span>
              <input
                className="field__control"
                onChange={(event) => setTargetRole(event.target.value)}
                placeholder="Senior Product Designer"
                type="text"
                value={targetRole}
              />
            </label>

            <label className="field">
              <span>Target Company</span>
              <input
                className="field__control"
                onChange={(event) => setTargetCompany(event.target.value)}
                placeholder="OpenAI"
                type="text"
                value={targetCompany}
              />
            </label>

            <label className="field">
              <span>Job Description / Notes</span>
              <textarea
                className="text-area"
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the job description or key notes the tailoring engine should target."
                value={jobDescription}
              />
            </label>

            <label className="field">
              <span>OpenAI API Key</span>
              <div className="field__input">
                <input
                  readOnly
                  type={showApiKey ? 'text' : 'password'}
                  value="sk-live-demo-validated-key"
                />
                <button
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  className="field__icon"
                  onClick={() => setShowApiKey((current) => !current)}
                  type="button"
                >
                  <FontAwesomeIcon icon={showApiKey ? faEyeSlash : faEye} />
                </button>
              </div>
              <small className="field__hint field__hint--success">Key validated</small>
            </label>

            <label className="field">
              <span>Target Model</span>
              <select
                className="field__control"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
              >
                <option>gpt-4o (Standard)</option>
                <option>gpt-4o-mini (Cost Optimized)</option>
                <option>gpt-3.5-turbo (Legacy)</option>
              </select>
            </label>

            <div className="field">
              <span>Temperature</span>
              <div className="slider-readout">
                <input
                  className="range-input"
                  max="1"
                  min="0"
                  onChange={(event) => setTemperature(Number(event.target.value))}
                  step="0.1"
                  type="range"
                  value={temperature}
                />
                <strong>{temperature.toFixed(1)}</strong>
              </div>
              <small className="field__hint">
                Lower values are more deterministic and precise.
              </small>
            </div>
          </div>

          <div className="auth-note">
            {jobStatus || (masterResume ? 'Master resume is loaded and ready for generation.' : 'No master resume loaded yet. Upload one on the ingest page first.')}
          </div>

          <div className="action-stack">
            <button className="button button--primary button--full" onClick={() => void handleGenerateDraft()} type="button">
              {isGenerating ? <FontAwesomeIcon icon={faSpinner} spin /> : null}
              Generate Draft
            </button>
            <Link className="button button--ghost button--full" to="/review">
              Open Review Workspace
            </Link>
            <button className="button button--ghost button--full" type="button">
              Test Connection
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default ConfigPage
