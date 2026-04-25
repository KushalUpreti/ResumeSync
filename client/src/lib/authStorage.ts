import { isTokenExpired, parseJwt } from './jwt'

export type StoredSession = {
  accessToken: string
  idToken: string
  refreshToken?: string
}

export type StoredUser = {
  id: string
  email: string
  name: string
  provider: string
}

const SESSION_STORAGE_KEY = 'resumesync-auth-session'

export function saveSession(session: StoredSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function readSession(): StoredSession | null {
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!stored) {
    return null
  }

  try {
    const session = JSON.parse(stored) as StoredSession
    if (isTokenExpired(session.idToken) || isTokenExpired(session.accessToken)) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function readUserFromSession(session: StoredSession): StoredUser | null {
  const payload = parseJwt(session.idToken)
  if (!payload?.sub) {
    return null
  }

  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
    name:
      typeof payload.name === 'string'
        ? payload.name
        : typeof payload.email === 'string'
          ? payload.email
          : 'ResumeSync user',
    provider: 'Cognito',
  }
}

export function getAccessToken() {
  return readSession()?.accessToken ?? null
}
