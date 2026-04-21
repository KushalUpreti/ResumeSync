import { useRef, useState, type DragEvent } from 'react'
import AuthModal from './components/AuthModal'
import './App.css'
import IngestionPage, { type Mode, type ResumeItem } from './pages/IngestionPage'
import LandingPage from './pages/LandingPage'

const starterResumes: ResumeItem[] = [
  {
    id: 1,
    name: 'Product-Manager-Resume.docx',
    updatedAt: 'Saved 2 days ago',
    status: 'Ready for Sniper mode',
  },
  {
    id: 2,
    name: 'Growth-Marketing-Resume.docx',
    updatedAt: 'Saved last week',
    status: 'Polished baseline',
  },
]

type Page = 'landing' | 'ingestion'
type AuthView = 'signIn' | 'signUp'

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState<Page>('landing')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<AuthView>('signUp')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('Guest')
  const [mode, setMode] = useState<Mode>('polisher')
  const [details, setDetails] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)
  const [savedResumes, setSavedResumes] = useState<ResumeItem[]>(starterResumes)

  function openAuthModal(view: AuthView) {
    setAuthView(view)
    setIsAuthOpen(true)
  }

  function closeAuthModal() {
    setIsAuthOpen(false)
  }

  function completeAuth(provider: string) {
    setIsLoggedIn(true)
    setUserName(provider === 'Email' ? 'Avery' : `${provider} user`)
    setIsAuthOpen(false)
  }

  function handleFilePicked(fileList: FileList | null) {
    const nextFile = fileList?.[0]
    if (!nextFile) {
      return
    }

    setSelectedFile(nextFile)
    setSelectedResumeId(null)

    if (isLoggedIn) {
      setSavedResumes((current) => [
        {
          id: Date.now(),
          name: nextFile.name,
          updatedAt: 'Saved just now',
          status: 'Fresh upload',
        },
        ...current,
      ])
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragActive(false)
    handleFilePicked(event.dataTransfer.files)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage('landing')} type="button">
          ResumeSync AI
        </button>
        <div className="topbar__actions">
          {isLoggedIn ? (
            <button className="ghost-button" type="button">
              {userName}
            </button>
          ) : (
            <>
              <button
                className="ghost-button"
                onClick={() => openAuthModal('signIn')}
                type="button"
              >
                Log in
              </button>
              <button
                className="primary-button"
                onClick={() => openAuthModal('signUp')}
                type="button"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      {page === 'landing' ? (
        <LandingPage
          onTryNow={() => setPage('ingestion')}
          onOpenSignUp={() => openAuthModal('signUp')}
        />
      ) : (
        <IngestionPage
          details={details}
          dragActive={dragActive}
          fileInputRef={fileInputRef}
          isLoggedIn={isLoggedIn}
          mode={mode}
          savedResumes={savedResumes}
          selectedFile={selectedFile}
          selectedResumeId={selectedResumeId}
          onDetailsChange={setDetails}
          onDragActiveChange={setDragActive}
          onDrop={handleDrop}
          onFilePick={handleFilePicked}
          onOpenLogin={() => openAuthModal('signIn')}
          onResumeSelect={(resumeId) => {
            setSelectedResumeId(resumeId)
            setSelectedFile(null)
          }}
          onModeSelect={setMode}
        />
      )}

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
