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
