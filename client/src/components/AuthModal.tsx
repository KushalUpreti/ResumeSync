import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEnvelope,
  faTimes,
} from '@fortawesome/free-solid-svg-icons'
import {
  faGoogle,
  faLinkedinIn,
} from '@fortawesome/free-brands-svg-icons'
import type { AuthView } from '../context/AuthContext'

type AuthModalProps = {
  authView: AuthView
  onClose: () => void
  onSwitchView: (view: AuthView) => void
  onCompleteAuth: (provider: string) => void
}

function AuthModal({
  authView,
  onClose,
  onSwitchView,
  onCompleteAuth,
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
            onClick={() => onCompleteAuth('Google')}
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
            onClick={() => onCompleteAuth('LinkedIn')}
            type="button"
          >
            <span className="social-button__meta">
              <FontAwesomeIcon icon={faLinkedinIn} />
              Federated
            </span>
            Continue with LinkedIn
          </button>
          <button
            className="social-button"
            onClick={() => onCompleteAuth('Email')}
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
          Designed as a Cognito-style hosted auth entry point with email and federated
          providers. Wiring can be swapped to real Cognito flows once auth is configured.
        </div>
      </section>
    </div>
  )
}

export default AuthModal
