import axios from 'axios'
import { env } from '../config/env'
import { clearSession, saveSession, type StoredSession } from './authStorage'

const PKCE_STORAGE_KEY = 'resumesync-pkce'

type HostedAuthOptions = {
  identityProvider?: 'Google'
  screenHint?: 'signup'
}

type PkceState = {
  codeVerifier: string
  state: string
}

function randomString(length: number) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = new Uint8Array(length)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join('')
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  return new Uint8Array(digest)
}

function toBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function writePkceState(state: PkceState) {
  window.sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(state))
}

function readPkceState(): PkceState | null {
  const stored = window.sessionStorage.getItem(PKCE_STORAGE_KEY)
  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as PkceState
  } catch {
    window.sessionStorage.removeItem(PKCE_STORAGE_KEY)
    return null
  }
}

function clearPkceState() {
  window.sessionStorage.removeItem(PKCE_STORAGE_KEY)
}

export async function startHostedAuth(options: HostedAuthOptions = {}) {
  const codeVerifier = randomString(64)
  const codeChallenge = toBase64Url(await sha256(codeVerifier))
  const state = randomString(32)
  writePkceState({ codeVerifier, state })

  const searchParams = new URLSearchParams({
    response_type: 'code',
    client_id: env.cognitoClientId,
    redirect_uri: env.cognitoRedirectUri,
    scope: 'openid email profile',
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  })

  if (options.identityProvider) {
    searchParams.set('identity_provider', options.identityProvider)
  }

  if (options.screenHint) {
    searchParams.set('screen_hint', options.screenHint)
  }

  window.location.assign(`${env.cognitoDomain}/oauth2/authorize?${searchParams.toString()}`)
}

export async function exchangeAuthorizationCode(code: string, returnedState: string | null) {
  const pkce = readPkceState()
  if (!pkce) {
    throw new Error('Login session expired before callback completed')
  }

  if (!returnedState || returnedState !== pkce.state) {
    throw new Error('Invalid login state returned from Cognito')
  }

  const tokenResponse = await axios.post(
    `${env.cognitoDomain}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.cognitoClientId,
      code,
      redirect_uri: env.cognitoRedirectUri,
      code_verifier: pkce.codeVerifier,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  )

  const session: StoredSession = {
    accessToken: tokenResponse.data.access_token,
    idToken: tokenResponse.data.id_token,
    refreshToken: tokenResponse.data.refresh_token,
  }

  saveSession(session)
  clearPkceState()
  return session
}

export function buildLogoutUrl() {
  const searchParams = new URLSearchParams({
    client_id: env.cognitoClientId,
    logout_uri: env.cognitoLogoutUri,
  })
  return `${env.cognitoDomain}/logout?${searchParams.toString()}`
}

export function clearHostedAuthState() {
  clearPkceState()
  clearSession()
}
