import React, { useState, useEffect } from 'react'

type AIConfigModalProps = {
  isOpen: boolean
  onClose: () => void
}

type AIProvider = 'openai' | 'anthropic' | 'google'

export function AIConfigModal({ isOpen, onClose }: AIConfigModalProps) {
  const [provider, setProvider] = useState<AIProvider>('google')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider
    const savedKey = localStorage.getItem('ai_api_key')
    if (savedProvider) setProvider(savedProvider)
    if (savedKey) setApiKey(savedKey)
  }, [isOpen])

  const handleSave = () => {
    localStorage.setItem('ai_provider', provider)
    localStorage.setItem('ai_api_key', apiKey)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content--small">
        <div className="modal-header">
          <h2 className="modal-title">AI Configuration</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <p className="text-muted mb-4">
            Bring your own key to power the AI features. Your key is stored only in your browser.
          </p>

          <div className="form-group mb-4">
            <label className="label">AI Provider</label>
            <div className="radio-group radio-group--block">
              <label className={`radio-item ${provider === 'google' ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="google"
                  checked={provider === 'google'}
                  onChange={(e) => setProvider(e.target.value as AIProvider)}
                />
                <span>Gemini (Google)</span>
              </label>
              <label className={`radio-item ${provider === 'openai' ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  checked={provider === 'openai'}
                  onChange={(e) => setProvider(e.target.value as AIProvider)}
                />
                <span>GPT-4 (OpenAI)</span>
              </label>
              <label className={`radio-item ${provider === 'anthropic' ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="anthropic"
                  checked={provider === 'anthropic'}
                  onChange={(e) => setProvider(e.target.value as AIProvider)}
                />
                <span>Claude (Anthropic)</span>
              </label>
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="label">API Key</label>
            <input
              type="password"
              className="input"
              placeholder={`Enter your ${provider} API key`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button--ghost" onClick={onClose}>Cancel</button>
          <button className="button button--primary" onClick={handleSave}>Save Configuration</button>
        </div>
      </div>
    </div>
  )
}
