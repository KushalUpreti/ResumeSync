import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBrain,
  faCheckCircle,
  faEye,
  faEyeSlash,
  faMemory,
  faMicrochip,
  faCloud,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'
import SectionCard from '../components/SectionCard'
import { useNotification } from '../context/useNotification'
import { providerCards } from '../data/mockData'

const providerIconMap = {
  OpenAI: faBrain,
  Anthropic: faMicrochip,
  'Google Gemini': faMemory,
  'AWS Bedrock': faCloud,
} as const

const modelMappings: Record<string, { label: string; value: string }[]> = {
  OpenAI: [
    { label: 'GPT-5.5 (Latest Flagship)', value: 'gpt-5.5' },
    { label: 'GPT-5.4 Pro (High Performance)', value: 'gpt-5.4-pro' },
    { label: 'GPT-5.4 Mini (Cost Optimized)', value: 'gpt-5.4-mini' },
    { label: 'GPT-4o Mini (Legacy/Cheap)', value: 'gpt-4o-mini' },
  ],
  Anthropic: [
    { label: 'Claude 4.8 Opus (Latest Flagship)', value: 'anthropic/claude-4-8-opus-latest' },
    { label: 'Claude 4.6 Sonnet (Powerful)', value: 'anthropic/claude-4-6-sonnet-latest' },
    { label: 'Claude 4.5 Haiku (Fast/Cheap)', value: 'anthropic/claude-4-5-haiku-latest' },
    { label: 'Claude 3.5 Haiku (Legacy/Cheap)', value: 'anthropic/claude-3-5-haiku-20241022' },
  ],
  'Google Gemini': [
    { label: 'Gemini 3.1 Flash Lite (Best throughput + RPM)', value: 'gemini/gemini-3.1-flash-lite' },
    { label: 'Gemini 2.5 Flash Lite (High TPM, decent RPM)', value: 'gemini/gemini-2.5-flash-lite' },
    { label: 'Gemini 3 Flash (High TPM bottleneck)', value: 'gemini/gemini-3-flash' },
    { label: 'Gemini 2.5 Flash (Older version)', value: 'gemini/gemini-2.5-flash' },
  ],
  'AWS Bedrock': [
    { label: 'Nova 2 Lite on Bedrock (Latest, efficient)', value: 'bedrock/converse/us.amazon.nova-2-lite-v1:0' },
    { label: 'Nova Premier on Bedrock (Most capable v1)', value: 'bedrock/converse/us.amazon.nova-premier-v1:0' },
    { label: 'Nova Pro on Bedrock (Balanced v1)', value: 'bedrock/converse/us.amazon.nova-pro-v1:0' },
    { label: 'Nova Lite on Bedrock (Low cost v1)', value: 'bedrock/converse/us.amazon.nova-lite-v1:0' },
    { label: 'Nova Micro on Bedrock (Fast text v1)', value: 'bedrock/converse/us.amazon.nova-micro-v1:0' },
  ],
}

const providerSlugMappings: Record<string, string> = {
  OpenAI: 'openai',
  Anthropic: 'anthropic',
  'Google Gemini': 'google',
  'AWS Bedrock': 'bedrock',
}

type ConfigStepProps = {
  onNext: () => void
  onBack: () => void
}

function ConfigStep({ onNext }: ConfigStepProps) {
  const { addNotification } = useNotification()
  const [showApiKey, setShowApiKey] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(() => localStorage.getItem('ai_provider_display') || 'OpenAI')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || '')
  const [selectedModel, setSelectedModel] = useState(() => {
    const savedProvider = localStorage.getItem('ai_provider_display') || 'OpenAI'
    return localStorage.getItem('ai_model') || modelMappings[savedProvider]?.[0].value || modelMappings.OpenAI[0].value
  })

  const isBedrockSelected = selectedProvider === 'AWS Bedrock'

  useEffect(() => {
    localStorage.setItem('ai_provider_display', selectedProvider)
    localStorage.setItem('ai_provider', providerSlugMappings[selectedProvider] || 'openai')
    localStorage.setItem('ai_model', selectedModel)
  }, [selectedModel, selectedProvider])

  const handleProviderChange = (providerName: string) => {
    setSelectedProvider(providerName)
    setApiKey('')
    localStorage.removeItem('ai_api_key')

    const defaultModel = modelMappings[providerName][0].value
    setSelectedModel(defaultModel)
  }

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    localStorage.setItem('ai_model', value)
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    localStorage.setItem('ai_api_key', value)
  }

  async function handleSaveConfig() {
    if (!apiKey) {
      addNotification({
        type: 'warning',
        message: 'Missing API Key',
        description: 'Please provide an API key to proceed.'
      })
      return
    }
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
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {provider.name}
                      {(provider.name === 'OpenAI' || provider.name === 'Anthropic') && (
                        <span title="These models have not been fully verified as they require paid API credits." style={{ color: '#f59e0b', fontSize: '0.8em', cursor: 'help' }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} />
                        </span>
                      )}
                    </h3>
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
                  placeholder={isBedrockSelected ? 'Enter your AWS Bedrock API key' : `Enter your ${selectedProvider} API key`}
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


          </div>

          <div className="action-stack">
            <button
              className="button button--primary button--full"
              onClick={() => void handleSaveConfig()}
              type="button"
            >
              Save Configuration &amp; Continue &rarr;
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default ConfigStep
