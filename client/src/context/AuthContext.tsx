import {
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import { AuthContext } from './authShared'
import type { AuthState } from './authTypes'
import { env, hasCognitoConfig } from '../config/env'
import {
  buildLogoutUrl,
  clearHostedAuthState,
  exchangeAuthorizationCode,
  startHostedAuth,
} from '../lib/cognito'
import { clearSession, readSession, readUserFromSession } from '../lib/authStorage'

function getInitialAuthState(): AuthState {
  const session = readSession()
  if (!session) {
    return { status: 'unauthenticated', user: null }
  }

  const user = readUserFromSession(session)
  if (!user) {
    clearSession()
    return { status: 'unauthenticated', user: null }
  }

  return { status: 'authenticated', user }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(getInitialAuthState)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<'signIn' | 'signUp'>('signUp')

  const openAuthModal = useCallback((view: 'signIn' | 'signUp') => {
    setAuthView(view)
    setIsAuthOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthOpen(false)
  }, [])

  const beginAuth = useCallback(async (options?: { google?: boolean; signUp?: boolean }) => {
    if (!hasCognitoConfig()) {
      setAuth({
        status: 'error',
        user: null,
        error: `Missing Cognito config: ${env.missingCognitoKeys.join(', ')}`,
      })
      return
    }

    await startHostedAuth({
      identityProvider: options?.google ? 'Google' : undefined,
      screenHint: options?.signUp ? 'signup' : undefined,
    })
  }, [])

  const finishHostedLogin = useCallback(async (code: string, state: string | null) => {
    const session = await exchangeAuthorizationCode(code, state)
    const user = readUserFromSession(session)
    if (!user) {
      throw new Error('Cognito returned tokens but no usable user profile was found.')
    }
    setAuth({ status: 'authenticated', user })
    setIsAuthOpen(false)
  }, [])

  const startEmailSignIn = useCallback(async () => {
    await beginAuth()
  }, [beginAuth])

  const startEmailSignUp = useCallback(async () => {
    await beginAuth({ signUp: true })
  }, [beginAuth])

  const startGoogleSignIn = useCallback(async () => {
    await beginAuth({ google: true })
  }, [beginAuth])

  const signOut = useCallback(() => {
    clearHostedAuthState()
    setAuth({ status: 'unauthenticated', user: null })
    window.location.assign(buildLogoutUrl())
  }, [])

  const authConfigError = hasCognitoConfig() ? null : `Missing Cognito config: ${env.missingCognitoKeys.join(', ')}`

  const value = {
    auth,
    authView,
    isAuthOpen,
    closeAuthModal,
    openAuthModal,
    setAuthView,
    startEmailSignIn,
    startEmailSignUp,
    startGoogleSignIn,
    finishHostedLogin,
    signOut,
    authConfigError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }
