type AuthView = 'signIn' | 'signUp'

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
            <h2>{authView === 'signIn' ? 'Welcome back' : 'Create your account'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            x
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
            Continue with Google
          </button>
          <button
            className="social-button"
            onClick={() => onCompleteAuth('LinkedIn')}
            type="button"
          >
            Continue with LinkedIn
          </button>
          <button
            className="social-button"
            onClick={() => onCompleteAuth('Email')}
            type="button"
          >
            {authView === 'signIn' ? 'Continue with email' : 'Sign up with email'}
          </button>
        </div>

        <div className="auth-note">
          Designed as a Cognito-style hosted auth entry point with email and
          federated providers. Wiring can be swapped to real Cognito flows once
          auth is configured.
        </div>
      </section>
    </div>
  )
}

export default AuthModal
