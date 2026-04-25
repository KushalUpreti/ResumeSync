export type AuthView = 'signIn' | 'signUp'

export type AuthUser = {
  id: string
  name: string
  provider: string
  email: string
}

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'unauthenticated'; user: null }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error'; user: null; error: string }

export type AuthContextValue = {
  auth: AuthState
  authView: AuthView
  isAuthOpen: boolean
  closeAuthModal: () => void
  openAuthModal: (view: AuthView) => void
  setAuthView: (view: AuthView) => void
  startEmailSignIn: () => Promise<void>
  startEmailSignUp: () => Promise<void>
  startGoogleSignIn: () => Promise<void>
  finishHostedLogin: (code: string, state: string | null) => Promise<void>
  signOut: () => void
  authConfigError: string | null
}
