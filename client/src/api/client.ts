import axios from 'axios'
import { env } from '../config/env'
import { getAccessToken } from '../lib/authStorage'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl || undefined,
})

export function getApiErrorMessage(error: unknown, fallback: string) {
  // Handle Axios errors with possible structured detail payloads.
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as any
    // FastAPI / Pydantic validation errors are often under `detail` and can be an array or object.
    const detail = responseData?.detail
    if (detail !== undefined) {
      try {
        // If it's already a string, return it directly.
        if (typeof detail === 'string') {
          return detail
        }
        // For arrays or objects, stringify for a readable message.
        return JSON.stringify(detail)
      } catch {
        // Fallback to generic string conversion.
        return String(detail)
      }
    }
    // If no `detail` field, fallback to the Axios error message if present or stringified data.
    if (responseData) {
      try {
        return typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
      } catch {
        // Continue to check error.message
      }
    }
    if (error.message) {
      return error.message
    }
  }
  // Generic Error instance handling.
  if (error instanceof Error) {
    return error.message
  }
  // As a final fallback, return the provided fallback message.
  return fallback
}

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
