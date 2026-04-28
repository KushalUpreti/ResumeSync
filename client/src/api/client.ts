import axios from 'axios'
import { env } from '../config/env'
import { getAccessToken } from '../lib/authStorage'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl || undefined,
})

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  } else {
    // Generate/retrieve a session ID for guest mode
    let sessionId = localStorage.getItem('guest_session_id')
    if (!sessionId) {
      sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`
      localStorage.setItem('guest_session_id', sessionId)
    }
    config.headers['X-Session-ID'] = sessionId
    config.headers['X-Anonymous'] = 'true'
  }

  const aiProvider = localStorage.getItem('ai_provider')
  const aiModel = localStorage.getItem('ai_model')
  const aiApiKey = localStorage.getItem('ai_api_key')

  if (aiProvider) {
    config.headers['X-AI-Provider'] = aiProvider
  }
  if (aiModel) {
    config.headers['X-AI-Model'] = aiModel
  }
  if (aiApiKey) {
    config.headers['X-AI-API-Key'] = aiApiKey
  }

  return config
})
