import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { WorkspaceContext, type WorkspaceContextValue, type WorkspaceState } from './workspaceShared'

const WORKSPACE_STORAGE_KEY = 'resumesync-workspace'

const initialState: WorkspaceState = {
  masterResume: null,
  draftResume: null,
  generatedResumeId: null,
  generatedJsonKey: null,
  generatedFileBaseName: 'Tailored Resume',
  selectedTemplateId: 'executive',
  tailoringMode: 'polisher',
  targetRole: '',
  targetCompany: '',
  jobDescription: '',
  lastGenerateJob: null,
  lastRenderJob: null,
}

function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() => {
    const stored = window.sessionStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!stored) {
      return initialState
    }

    try {
      const parsed = JSON.parse(stored) as Partial<WorkspaceState>
      return {
        ...initialState,
        ...parsed,
        masterResume: null,
        draftResume: null,
        generatedFileBaseName: typeof parsed.generatedFileBaseName === 'string' && parsed.generatedFileBaseName.trim()
          ? parsed.generatedFileBaseName
          : initialState.generatedFileBaseName,
      }
    } catch {
      return initialState
    }
  })

  useEffect(() => {
    // We persist the UI state (mode, template, etc.) but NOT the resume documents themselves.
    // This forces the app to always sync with S3 on a page reload.
    const { masterResume, draftResume, jobDescription, ...persistentState } = state
    void masterResume
    void draftResume
    window.sessionStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(persistentState))
  }, [state])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...state,
      resetWorkspace: () => setState(initialState),
      setMasterResume: (document) => setState((current) => ({ ...current, masterResume: document })),
      setDraftResume: (document) => setState((current) => ({ ...current, draftResume: document })),
      setGeneratedResume: (resumeId, jsonKey) =>
        setState((current) => ({
          ...current,
          generatedResumeId: resumeId,
          generatedJsonKey: jsonKey,
          generatedFileBaseName: resumeId ? 'Tailored Resume' : current.generatedFileBaseName,
        })),
      setGeneratedFileBaseName: (value) =>
        setState((current) => ({
          ...current,
          generatedFileBaseName: value,
        })),
      setSelectedTemplateId: (templateId) =>
        setState((current) => ({ ...current, selectedTemplateId: templateId })),
      setTailoringMode: (mode) => setState((current) => ({ ...current, tailoringMode: mode })),
      setTargetRole: (value) => setState((current) => ({ ...current, targetRole: value })),
      setTargetCompany: (value) => setState((current) => ({ ...current, targetCompany: value })),
      setJobDescription: (value) => setState((current) => ({ ...current, jobDescription: value })),
      setLastGenerateJob: (job) => setState((current) => ({ ...current, lastGenerateJob: job })),
      setLastRenderJob: (job) => setState((current) => ({ ...current, lastRenderJob: job })),
    }),
    [state],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export { WorkspaceProvider }
