import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function AuthCallbackPage() {
  const navigate = useNavigate()
  const { finishHostedLogin } = useAuth()
  const [error, setError] = useState('')
  const callbackParams = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search)
    return {
      code: searchParams.get('code'),
      state: searchParams.get('state'),
      hostedError: searchParams.get('error_description') || searchParams.get('error'),
    }
  }, [])

  useEffect(() => {
    if (callbackParams.hostedError) {
      window.setTimeout(() => setError(callbackParams.hostedError ?? 'Unable to sign in.'), 0)
      return
    }

    if (!callbackParams.code) {
      window.setTimeout(() => setError('No authorization code was returned from Cognito.'), 0)
      return
    }

    finishHostedLogin(callbackParams.code, callbackParams.state)
      .then(() => navigate('/ingest', { replace: true }))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Unable to finish sign-in.')
      })
  }, [callbackParams, finishHostedLogin, navigate])

  return (
    <div className="page-stack">
      <section className="page-intro">
        <p className="eyebrow">Authentication</p>
        <h1 className="page-title page-title--medium">
          {error ? 'We hit a sign-in problem' : 'Finishing sign-in'}
        </h1>
        <p className="page-copy">
          {error || 'Cognito handed control back to the app. We are validating your session now.'}
        </p>
      </section>
    </div>
  )
}

export default AuthCallbackPage
