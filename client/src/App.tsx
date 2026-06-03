import { Route, Routes, useLocation } from 'react-router-dom'
import AuthModal from './components/AuthModal'
import AppFooter from './components/AppFooter'
import AppHeader from './components/AppHeader'
import './App.css'
import { useAuth } from './context/useAuth'
import AuthCallbackPage from './pages/AuthCallbackPage'
import LandingPage from './pages/LandingPage'
import ProfilePage from './pages/ProfilePage'
import PrototypePage from './pages/PrototypePage'
import ProcessPage from './pages/ProcessPage'

function App() {
  const location = useLocation()
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
  const isPrototypeRoute = location.pathname === '/prototype'

  return (
    <div className={isPrototypeRoute ? 'app-shell app-shell--prototype' : 'app-shell'}>
      <AppHeader
        auth={auth}
        onOpenAuthModal={openAuthModal}
        onSignOut={signOut}
      />
      <main
        className={
          isPrototypeRoute
            ? 'app-shell__main app-shell__main--prototype'
            : 'app-shell__main'
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                isLoggedIn={isLoggedIn}
              />
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/prototype"
            element={<PrototypePage isLoggedIn={isLoggedIn} />}
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/process" element={<ProcessPage />} />
        </Routes>
      </main>
      {isPrototypeRoute ? null : <AppFooter />}

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
