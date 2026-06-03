import {
  useEffect,
  useMemo,
  useState,
  useCallback,
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

  const resetWorkspace = useCallback(() => setState(initialState), [])
  const setMasterResume = useCallback(
    (document: ResumeDocument | null) =>
      setState((current) => ({ ...current, masterResume: document })),
    [],
  )
  const setDraftResume = useCallback(
    (document: ResumeDocument | null) =>
      setState((current) => ({ ...current, draftResume: document })),
    [],
  )
  const setGeneratedResume = useCallback(
    (resumeId: string | null, jsonKey: string | null) =>
      setState((current) => ({
        ...current,
        generatedResumeId: resumeId,
        generatedJsonKey: jsonKey,
        generatedFileBaseName: resumeId ? 'Tailored Resume' : current.generatedFileBaseName,
      })),
    [],
  )
  const setGeneratedFileBaseName = useCallback(
    (value: string) =>
      setState((current) => ({
        ...current,
        generatedFileBaseName: value,
      })),
    [],
  )
  const setSelectedTemplateId = useCallback(
    (templateId: string) =>
      setState((current) => ({ ...current, selectedTemplateId: templateId })),
    [],
  )
  const setTailoringMode = useCallback(
    (mode: TailoringMode) =>
      setState((current) => ({ ...current, tailoringMode: mode })),
    [],
  )
  const setTargetRole = useCallback(
    (value: string) => setState((current) => ({ ...current, targetRole: value })),
    [],
  )
  const setTargetCompany = useCallback(
    (value: string) =>
      setState((current) => ({ ...current, targetCompany: value })),
    [],
  )
  const setJobDescription = useCallback(
    (value: string) =>
      setState((current) => ({ ...current, jobDescription: value })),
    [],
  )
  const setLastGenerateJob = useCallback(
    (job: JobState | CreateJobResponse | null) =>
      setState((current) => ({ ...current, lastGenerateJob: job })),
    [],
  )
  const setLastRenderJob = useCallback(
    (job: JobState | null) =>
      setState((current) => ({ ...current, lastRenderJob: job })),
    [],
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...state,
      resetWorkspace,
      setMasterResume,
      setDraftResume,
      setGeneratedResume,
      setGeneratedFileBaseName,
      setSelectedTemplateId,
      setTailoringMode,
      setTargetRole,
      setTargetCompany,
      setJobDescription,
      setLastGenerateJob,
      setLastRenderJob,
    }),
    [
      state,
      resetWorkspace,
      setMasterResume,
      setDraftResume,
      setGeneratedResume,
      setGeneratedFileBaseName,
      setSelectedTemplateId,
      setTailoringMode,
      setTargetRole,
      setTargetCompany,
      setJobDescription,
      setLastGenerateJob,
      setLastRenderJob,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export { WorkspaceProvider }
