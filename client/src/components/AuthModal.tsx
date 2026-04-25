import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEnvelope,
  faTimes,
} from '@fortawesome/free-solid-svg-icons'
import {
  faGoogle,
} from '@fortawesome/free-brands-svg-icons'
import type { AuthView } from '../context/authTypes'

type AuthModalProps = {
  authView: AuthView
  authConfigError: string | null
  onClose: () => void
  onSwitchView: (view: AuthView) => void
  onStartEmailSignIn: () => Promise<void>
  onStartEmailSignUp: () => Promise<void>
  onStartGoogleSignIn: () => Promise<void>
}

function AuthModal({
  authView,
  authConfigError,
  onClose,
  onSwitchView,
  onStartEmailSignIn,
  onStartEmailSignUp,
  onStartGoogleSignIn,
}: AuthModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <div className="auth-modal__header">
          <div>
            <p className="eyebrow">Secure access</p>
            <h2 className="auth-modal__title">
              {authView === 'signIn' ? 'Welcome back' : 'Create your account'}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="auth-toggle">
          <button
            className={authView === 'signIn' ? 'auth-toggle__item is-active' : 'auth-toggle__item'}
            onClick={() => onSwitchView('signIn')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={authView === 'signUp' ? 'auth-toggle__item is-active' : 'auth-toggle__item'}
            onClick={() => onSwitchView('signUp')}
            type="button"
          >
            Sign up
          </button>
        </div>

        <div className="auth-stack">
          <button
            className="social-button"
            onClick={() => void onStartGoogleSignIn()}
            type="button"
          >
            <span className="social-button__meta">
              <FontAwesomeIcon icon={faGoogle} />
              OAuth
            </span>
            Continue with Google
          </button>
          <button
            className="social-button"
            disabled
            type="button"
          >
            <span className="social-button__meta">
              <FontAwesomeIcon icon={faGoogle} />
              Soon
            </span>
            LinkedIn coming soon
          </button>
          <button
            className="social-button"
            onClick={() =>
              void (authView === 'signIn' ? onStartEmailSignIn() : onStartEmailSignUp())
            }
            type="button"
          >
            <span className="social-button__meta">
              <FontAwesomeIcon icon={faEnvelope} />
              Email
            </span>
            {authView === 'signIn' ? 'Continue with email' : 'Sign up with email'}
          </button>
        </div>

        <div className="auth-note">
          {authConfigError ??
            'Cognito hosted auth is wired for email and Google sign-in. LinkedIn is still a UI placeholder until that identity provider is configured.'}
        </div>
      </section>
    </div>
  )
}

export default AuthModal
