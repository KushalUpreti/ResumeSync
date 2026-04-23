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
} from '@fortawesome/free-solid-svg-icons'
import { Link, useLocation } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import SectionCard from '../components/SectionCard'
import { flowSteps, providerCards } from '../data/mockData'

const providerIconMap = {
  OpenAI: faBrain,
  Anthropic: faMicrochip,
  'Google Gemini': faMemory,
} as const

function ConfigPage() {
  const location = useLocation()
  const [showApiKey, setShowApiKey] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('OpenAI')
  const [selectedModel, setSelectedModel] = useState('gpt-4o (Standard)')
  const [temperature, setTemperature] = useState(0.7)

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

          <div className="action-stack">
            <Link className="button button--primary button--full" to="/review">
              Save & Continue
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
