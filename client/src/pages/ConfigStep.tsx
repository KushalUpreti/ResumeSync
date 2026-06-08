import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAws,
  faClaude,
  faGoogle,
  faOpenai,
} from "@fortawesome/free-brands-svg-icons";
import {
  faCheckCircle,
  faEye,
  faEyeSlash,
  faExclamationTriangle,
  faKey,
  faShieldHalved,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { getApiErrorMessage } from "../api/client";
import { validateAiKey } from "../api/resumeSync";
import SectionCard from "../components/SectionCard";
import { useNotification } from "../context/useNotification";
import { providerCards } from "../data/mockData";

const providerIconMap = {
  OpenAI: faOpenai,
  Anthropic: faClaude,
  "Google Gemini": faGoogle,
  "AWS Bedrock": faAws,
} as const;

const modelMappings: Record<string, { label: string; value: string }[]> = {
  OpenAI: [
    { label: "GPT-5.5 (Latest Flagship)", value: "gpt-5.5" },
    { label: "GPT-5.4 Pro (High Performance)", value: "gpt-5.4-pro" },
    { label: "GPT-5.4 Mini (Cost Optimized)", value: "gpt-5.4-mini" },
    { label: "GPT-4o Mini (Legacy/Cheap)", value: "gpt-4o-mini" },
  ],
  Anthropic: [
    {
      label: "Claude 4.8 Opus (Latest Flagship)",
      value: "anthropic/claude-4-8-opus-latest",
    },
    {
      label: "Claude 4.6 Sonnet (Powerful)",
      value: "anthropic/claude-4-6-sonnet-latest",
    },
    {
      label: "Claude 4.5 Haiku (Fast/Cheap)",
      value: "anthropic/claude-4-5-haiku-latest",
    },
    {
      label: "Claude 3.5 Haiku (Legacy/Cheap)",
      value: "anthropic/claude-3-5-haiku-20241022",
    },
  ],
  "Google Gemini": [
    {
      label: "Gemini 3.1 Flash Lite (Best throughput + RPM)",
      value: "gemini/gemini-3.1-flash-lite",
    },
    {
      label: "Gemini 2.5 Flash Lite (High TPM, decent RPM)",
      value: "gemini/gemini-2.5-flash-lite",
    },
    {
      label: "Gemini 3 Flash (High TPM bottleneck)",
      value: "gemini/gemini-3-flash",
    },
    {
      label: "Gemini 2.5 Flash (Older version)",
      value: "gemini/gemini-2.5-flash",
    },
  ],
  "AWS Bedrock": [
    {
      label: "Nova 2 Lite on Bedrock (Latest, efficient)",
      value: "bedrock/converse/us.amazon.nova-2-lite-v1:0",
    },
    {
      label: "Nova Premier on Bedrock (Most capable v1)",
      value: "bedrock/converse/us.amazon.nova-premier-v1:0",
    },
    {
      label: "Nova Pro on Bedrock (Balanced v1)",
      value: "bedrock/converse/us.amazon.nova-pro-v1:0",
    },
    {
      label: "Nova Lite on Bedrock (Low cost v1)",
      value: "bedrock/converse/us.amazon.nova-lite-v1:0",
    },
    {
      label: "Nova Micro on Bedrock (Fast text v1)",
      value: "bedrock/converse/us.amazon.nova-micro-v1:0",
    },
  ],
};

const providerSlugMappings: Record<string, string> = {
  OpenAI: "openai",
  Anthropic: "anthropic",
  "Google Gemini": "google",
  "AWS Bedrock": "bedrock",
};

const providerApiKeyLinks: Record<string, string> = {
  OpenAI: "https://platform.openai.com/api-keys",
  Anthropic: "https://console.anthropic.com/settings/keys",
  "Google Gemini": "https://aistudio.google.com/app/apikey",
  "AWS Bedrock": "https://console.aws.amazon.com/bedrock",
};

type ConfigStepProps = {
  onNext: () => void;
  onBack: () => void;
};

const getDefaultProvider = (provider: string | null) =>
  provider && modelMappings[provider] ? provider : "OpenAI";

const getDefaultModel = (provider: string) =>
  modelMappings[provider]?.[0].value || modelMappings.OpenAI[0].value;

const getValidModelForProvider = (provider: string, model: string | null) => {
  if (
    model &&
    modelMappings[provider]?.some((option) => option.value === model)
  ) {
    return model;
  }
  return getDefaultModel(provider);
};

function ConfigStep({ onNext }: ConfigStepProps) {
  const { addNotification } = useNotification();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(() =>
    getDefaultProvider(localStorage.getItem("ai_provider_display")),
  );
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("ai_api_key") || "",
  );
  const [selectedModel, setSelectedModel] = useState(() => {
    const savedProvider = getDefaultProvider(
      localStorage.getItem("ai_provider_display"),
    );
    return getValidModelForProvider(
      savedProvider,
      localStorage.getItem("ai_model"),
    );
  });

  const isBedrockSelected = selectedProvider === "AWS Bedrock";

  useEffect(() => {
    localStorage.setItem("ai_provider_display", selectedProvider);
    localStorage.setItem(
      "ai_provider",
      providerSlugMappings[selectedProvider] || "openai",
    );
    localStorage.setItem("ai_model", selectedModel);
  }, [selectedModel, selectedProvider]);

  const handleProviderChange = (providerName: string) => {
    const nextProvider = getDefaultProvider(providerName);
    setSelectedProvider(nextProvider);
    setApiKey("");
    localStorage.removeItem("ai_api_key");

    const defaultModel = getDefaultModel(nextProvider);
    setSelectedModel(defaultModel);
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    localStorage.setItem("ai_model", value);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem("ai_api_key", value);
  };

  async function handleTestApiKey() {
    if (!apiKey) {
      addNotification({
        type: "warning",
        message: "Missing API Key",
        description: "Please provide an API key before testing.",
      });
      return;
    }

    setIsTestingApiKey(true);
    try {
      const result = await validateAiKey();
      addNotification({
        type: "success",
        message: "API Key Valid",
        description: `Connected to ${result.provider} using ${result.model}.`,
      });
    } catch (error) {
      addNotification({
        type: "error",
        message: "API Key Test Failed",
        description: getApiErrorMessage(
          error,
          "Could not validate the selected AI provider credentials.",
        ),
      });
    } finally {
      setIsTestingApiKey(false);
    }
  }

  async function handleSaveConfig() {
    if (!apiKey) {
      addNotification({
        type: "warning",
        message: "Missing API Key",
        description: "Please provide an API key to proceed.",
      });
      return;
    }
    onNext();
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <p className="eyebrow">Engine Configuration</p>
        <h1 className="page-title page-title--medium">Engine Configuration</h1>
        <p className="page-copy">
          Select and configure your preferred AI orchestration engine for resume
          parsing.
        </p>
      </section>

      <div className="dashboard-grid dashboard-grid--config">
        <div className="provider-grid">
          {providerCards.map((provider) => {
            const isSelected = selectedProvider === provider.name;

            return (
              <article
                aria-pressed={isSelected}
                role="button"
                tabIndex={0}
                className={
                  isSelected
                    ? "section-card provider-card is-selected"
                    : "section-card provider-card"
                }
                key={provider.name}
                onClick={() => handleProviderChange(provider.name)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleProviderChange(provider.name);
                  }
                }}
              >
                <div className="provider-card__top">
                  <div className="provider-card__icon">
                    <FontAwesomeIcon
                      icon={
                        providerIconMap[
                          provider.name as keyof typeof providerIconMap
                        ]
                      }
                    />
                  </div>
                  <div>
                    <h3
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {provider.name}
                      {(provider.name === "OpenAI" ||
                        provider.name === "Anthropic") && (
                        <span
                          title="These models have not been fully verified as they require paid API credits."
                          style={{
                            color: "#f59e0b",
                            fontSize: "0.8em",
                            cursor: "help",
                          }}
                        >
                          <FontAwesomeIcon icon={faExclamationTriangle} />
                        </span>
                      )}
                    </h3>
                    <a
                      className="provider-card__api-link"
                      href={providerApiKeyLinks[provider.name]}
                      onClick={(event) => event.stopPropagation()}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Find your API key
                    </a>
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
              </article>
            );
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
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={
                    isBedrockSelected
                      ? "Enter your AWS Bedrock API key"
                      : `Enter your ${selectedProvider} API key`
                  }
                />
                <button
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  className="field__icon"
                  onClick={() => setShowApiKey((current) => !current)}
                  type="button"
                >
                  <FontAwesomeIcon icon={showApiKey ? faEyeSlash : faEye} />
                </button>
              </div>
              <div className="key-privacy-note">
                <FontAwesomeIcon icon={faShieldHalved} />
                <p>
                  Your key stays in this browser only. When it is used for a
                  request, it is sent over encrypted HTTPS and never displayed
                  back in the app.
                </p>
              </div>
            </label>

            <label className="field" style={{ marginTop: "52px" }}>
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
              className="button button--full config-test-key-button"
              disabled={isTestingApiKey}
              onClick={() => void handleTestApiKey()}
              type="button"
            >
              <FontAwesomeIcon
                icon={isTestingApiKey ? faSpinner : faKey}
                spin={isTestingApiKey}
              />
              {isTestingApiKey ? "Testing API Key..." : "Test API Key"}
            </button>
          </div>
        </SectionCard>
      </div>

      <section className="bottom-toolbar">
        <div className="bottom-toolbar__summary">
          <div className="bottom-toolbar__icon">AI</div>
          <div>
            <strong>Engine configuration</strong>
            <p>Choose a provider and save credentials before ingestion.</p>
          </div>
        </div>
        <div className="bottom-toolbar__actions">
          <button
            className="button button--primary"
            disabled={isTestingApiKey}
            onClick={() => void handleSaveConfig()}
            type="button"
          >
            Save Configuration &amp; Continue &rarr;
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfigStep;
