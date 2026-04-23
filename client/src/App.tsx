import { Route, Routes } from 'react-router-dom'
import AuthModal from './components/AuthModal'
import AppFooter from './components/AppFooter'
import AppHeader from './components/AppHeader'
import './App.css'
import { useAuth } from './context/AuthContext'
import ConfigPage from './pages/ConfigPage'
import ExportPage from './pages/ExportPage'
import IngestionPage from './pages/IngestionPage'
import LandingPage from './pages/LandingPage'
import ReviewPage from './pages/ReviewPage'

function App() {
  const {
    auth,
    authView,
    closeAuthModal,
    completeAuth,
    isAuthOpen,
    openAuthModal,
    setAuthView,
    signOut,
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
          <Route
            path="/ingest"
            element={<IngestionPage onOpenLogin={() => openAuthModal('signIn')} />}
          />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </main>
      <AppFooter />

      {isAuthOpen ? (
        <AuthModal
          authView={authView}
          onClose={closeAuthModal}
          onSwitchView={setAuthView}
          onCompleteAuth={completeAuth}
        />
      ) : null}
    </div>
  )
}

export default App
