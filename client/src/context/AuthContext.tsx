import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type AuthView = 'signIn' | 'signUp'

type AuthUser = {
  id: string
  name: string
  provider: string
}

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'unauthenticated'; user: null }
  | { status: 'authenticated'; user: AuthUser }

type AuthContextValue = {
  auth: AuthState
  authView: AuthView
  isAuthOpen: boolean
  closeAuthModal: () => void
  openAuthModal: (view: AuthView) => void
  setAuthView: (view: AuthView) => void
  completeAuth: (provider: string) => void
  signOut: () => void
}

const AUTH_STORAGE_KEY = 'resumesync-auth'

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading', user: null })
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<AuthView>('signUp')

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!stored) {
      setAuth({ status: 'unauthenticated', user: null })
      return
    }

    try {
      const user = JSON.parse(stored) as AuthUser
      setAuth({ status: 'authenticated', user })
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      setAuth({ status: 'unauthenticated', user: null })
    }
  }, [])

  function openAuthModal(view: AuthView) {
    setAuthView(view)
    setIsAuthOpen(true)
  }

  function closeAuthModal() {
    setIsAuthOpen(false)
  }

  function completeAuth(provider: string) {
    const user: AuthUser = {
      id: `${provider.toLowerCase()}-user`,
      name: provider === 'Email' ? 'Avery' : `${provider} user`,
      provider,
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    setAuth({ status: 'authenticated', user })
    setIsAuthOpen(false)
  }

  function signOut() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuth({ status: 'unauthenticated', user: null })
  }

  const value = useMemo(
    () => ({
      auth,
      authView,
      isAuthOpen,
      closeAuthModal,
      openAuthModal,
      setAuthView,
      completeAuth,
      signOut,
    }),
    [auth, authView, isAuthOpen],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export { AuthProvider, useAuth }
export type { AuthState, AuthUser, AuthView }
