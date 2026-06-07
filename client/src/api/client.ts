import axios from 'axios'
import { env } from '../config/env'
import { getAccessToken } from '../lib/authStorage'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl || undefined,
})

const QUOTA_LIMIT_MESSAGE =
  "Your usage quota has been reached for the current period. Please wait until your quota resets or update your plan to continue."

function isQuotaLimitMessage(value: unknown) {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.toLowerCase()
  return (
    normalized.includes('rate limit') ||
    normalized.includes('429') ||
    normalized.includes('quota') ||
    normalized.includes('current limit') ||
    normalized.includes('usage limit') ||
    normalized.includes('insufficient_quota') ||
    normalized.includes('out of credits') ||
    normalized.includes('credit balance') ||
    normalized.includes('purchase credits')
  )
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  // Handle Axios errors with possible structured detail payloads.
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as any
    const status = error.response?.status

    if (status === 429) {
      return QUOTA_LIMIT_MESSAGE
    }

    // FastAPI / Pydantic validation errors are often under `detail`
    const detail = responseData?.detail
    if (detail !== undefined) {
      try {
        if (typeof detail === 'string') {
          if (isQuotaLimitMessage(detail)) {
            return QUOTA_LIMIT_MESSAGE
          }
          return detail
        }
        return JSON.stringify(detail)
      } catch {
        return String(detail)
      }
    }

    // Friendly messages for common status codes when the API did not provide detail.
    if (status === 401) {
      return "Invalid API key. Please verify your credentials."
    }

    // Fallback to response data if present
    if (responseData) {
      try {
        return typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
      } catch {
        // Continue to check error.message
      }
    }
    if (error.message) {
      if (isQuotaLimitMessage(error.message)) {
        return QUOTA_LIMIT_MESSAGE
      }
      return error.message
    }
  }
  // Generic Error instance handling.
  if (error instanceof Error) {
    if (isQuotaLimitMessage(error.message)) {
      return QUOTA_LIMIT_MESSAGE
    }
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
