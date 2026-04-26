import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBrain,
  faCheckCircle,
  faEye,
  faEyeSlash,
  faMemory,
  faMicrochip,
  faPlus,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from 'react-router-dom'
import { createGenerateJob, waitForJob } from '../api/resumeSync'
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

const modelMappings: Record<string, { label: string; value: string }[]> = {
  OpenAI: [
    { label: 'gpt-4o (Standard)', value: 'gpt-4o' },
    { label: 'gpt-4o-mini (Cost Optimized)', value: 'gpt-4o-mini' },
    { label: 'gpt-3.5-turbo (Legacy)', value: 'gpt-3.5-turbo' },
  ],
  Anthropic: [
    { label: 'Claude 3.5 Sonnet (Powerful)', value: 'anthropic/claude-3-5-sonnet-20240620' },
    { label: 'Claude 3 Haiku (Fast)', value: 'anthropic/claude-3-haiku-20240307' },
    { label: 'Claude 3 Opus (Creative)', value: 'anthropic/claude-3-opus-20240229' },
  ],
  'Google Gemini': [
    { label: 'Gemini 1.5 Pro (Advanced)', value: 'gemini/gemini-1.5-pro' },
    { label: 'Gemini 1.5 Flash (Instant)', value: 'gemini/gemini-1.5-flash' },
  ],
}

type ConfigStepProps = {
  onNext: () => void
  onBack: () => void
}

function ConfigStep({ onNext, onBack }: ConfigStepProps) {
  const location = useLocation()
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
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [temperature, setTemperature] = useState(0.7)
  const [jobStatus, setJobStatus] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider_display') || 'OpenAI'
    const savedKey = localStorage.getItem('ai_api_key') || ''
    const savedModel = localStorage.getItem('ai_model') || modelMappings[savedProvider][0].value
    setSelectedProvider(savedProvider)
    setApiKey(savedKey)
    setSelectedModel(savedModel)
  }, [])

  const handleProviderChange = (providerName: string) => {
    setSelectedProvider(providerName)
    localStorage.setItem('ai_provider_display', providerName)

    const defaultModel = modelMappings[providerName][0].value
    setSelectedModel(defaultModel)
    localStorage.setItem('ai_model', defaultModel)

    // Map display name to backend slug
    let slug = 'openai'
    if (providerName === 'Anthropic') slug = 'anthropic'
    if (providerName === 'Google Gemini') slug = 'google'
    localStorage.setItem('ai_provider', slug)
  }

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    localStorage.setItem('ai_model', value)
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    localStorage.setItem('ai_api_key', value)
  }

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

  async function handleSaveConfig() {
    if (!apiKey) {
      setJobStatus('Please provide an API key to proceed.')
      return
    }
    setJobStatus('Configuration saved.')
    onNext()
  }

  return (
    <div className="page-stack">


      <section className="page-intro">
        <p className="eyebrow">Engine Configuration</p>
        <h1 className="page-title page-title--medium">Engine Configuration</h1>
        <p className="page-copy">
          Select and configure your preferred AI orchestration engine for resume parsing.
        </p>
      </section>

      <div className="dashboard-grid dashboard-grid--config">
        <div className="provider-grid">
          {providerCards.map((provider) => {
            const isSelected = selectedProvider === provider.name

            return (
              <button
                aria-pressed={isSelected}
                className={isSelected ? 'section-card provider-card is-selected' : 'section-card provider-card'}
                key={provider.name}
                onClick={() => handleProviderChange(provider.name)}
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

          <div className="provider-card provider-card--empty">
            <div className="provider-card__empty-icon">
              <FontAwesomeIcon icon={faPlus} />
            </div>
            <h3>Custom Provider (BYOK)</h3>
          </div>
        </div>

        <SectionCard className="config-panel">
          <div className="section-card__header">
            <p className="section-label">Configuration Details</p>
          </div>

          <div className="form-stack">

            <label className="field">
              <span>{selectedProvider} API Key</span>
              <div className="field__input">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={`Enter your ${selectedProvider} API key`}
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
              <div className="field__hint field__hint--success">
                <span className="dot dot--success"></span> {apiKey ? 'KEY VALIDATED' : 'NO KEY PROVIDED'}
              </div>
            </label>

            <label className="field">
              <span>Target Model</span>
              <select
                className="field__control"
                value={selectedModel}
                onChange={(event) => handleModelChange(event.target.value)}
              >
                {modelMappings[selectedProvider]?.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
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


          <div className="action-stack">
            <button className="button button--primary button--full" onClick={() => void handleSaveConfig()} type="button">
              Save & Start Ingestion &rarr;
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default ConfigStep
