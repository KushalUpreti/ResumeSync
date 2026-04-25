import { Link } from 'react-router-dom'
import type { AuthState, AuthView } from '../context/authTypes'

type AppHeaderProps = {
  auth: AuthState
  onOpenAuthModal: (view: AuthView) => void
  onOpenAIConfig: () => void
  onSignOut: () => void
}

function AppHeader({ auth, onOpenAuthModal, onOpenAIConfig, onSignOut }: AppHeaderProps) {
  const isLoggedIn = auth.status === 'authenticated'
  const userName = isLoggedIn ? auth.user.name || auth.user.email : null

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-mark" to="/">
          ResumeSync AI
        </Link>
        <div className="site-header__actions">
          {auth.status === 'loading' ? (
            <span className="status-badge">Loading session...</span>
          ) : auth.status === 'error' ? (
            <span className="status-badge">Auth config issue</span>
          ) : isLoggedIn ? (
            <>
              <button className="button button--ghost" type="button">
                {userName}
              </button>
              <button className="button button--ghost" onClick={onOpenAIConfig} type="button">
                AI Settings
              </button>
              <button className="button button--ghost" onClick={onSignOut} type="button">
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                className="button button--ghost"
                onClick={() => onOpenAuthModal('signIn')}
                type="button"
              >
                Login
              </button>
              <button
                className="button button--ghost"
                onClick={onOpenAIConfig}
                type="button"
              >
                AI Settings
              </button>
              <button
                className="button button--primary"
                onClick={() => onOpenAuthModal('signUp')}
                type="button"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default AppHeader
