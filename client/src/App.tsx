import { Route, Routes } from 'react-router-dom'
import AuthModal from './components/AuthModal'
import AppFooter from './components/AppFooter'
import AppHeader from './components/AppHeader'
import './App.css'
import { useAuth } from './context/useAuth'
import AuthCallbackPage from './pages/AuthCallbackPage'
import LandingPage from './pages/LandingPage'
import ProcessPage from './pages/ProcessPage'

function App() {
  const {
    auth,
    authView,
    authConfigError,
    closeAuthModal,
    isAuthOpen,
    openAuthModal,
    setAuthView,
    signOut,
    startEmailSignIn,
    startEmailSignUp,
    startGoogleSignIn,
  } = useAuth()
  const isLoggedIn = auth.status === 'authenticated'

  return (
    <div className="app-shell">
      <AppHeader
        auth={auth}
        onOpenAuthModal={openAuthModal}
        onSignOut={signOut}
      />
      <main className="app-shell__main">
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                isLoggedIn={isLoggedIn}
                onOpenSignUp={() => openAuthModal('signUp')}
              />
            }
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/process" element={<ProcessPage />} />
        </Routes>
      </main>
      <AppFooter />

      {isAuthOpen ? (
        <AuthModal
          authConfigError={authConfigError}
          authView={authView}
          onClose={closeAuthModal}
          onSwitchView={setAuthView}
          onStartEmailSignIn={startEmailSignIn}
          onStartEmailSignUp={startEmailSignUp}
          onStartGoogleSignIn={startGoogleSignIn}
        />
      ) : null}
    </div>
  )
}

export default App
