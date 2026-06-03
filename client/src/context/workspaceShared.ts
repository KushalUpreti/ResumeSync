import { createContext } from 'react'
import type { CreateJobResponse, JobState } from '../types/api'
import type { ResumeDocument } from '../types/resume'

export type TailoringMode = 'polisher' | 'sniper'

export type WorkspaceState = {
  masterResume: ResumeDocument | null
  draftResume: ResumeDocument | null
  generatedResumeId: string | null
  generatedJsonKey: string | null
  generatedFileBaseName: string
  selectedTemplateId: string
  tailoringMode: TailoringMode
  targetRole: string
  targetCompany: string
  jobDescription: string
  lastGenerateJob: JobState | CreateJobResponse | null
  lastRenderJob: JobState | null
}

export type WorkspaceContextValue = WorkspaceState & {
  resetWorkspace: () => void
  setMasterResume: (document: ResumeDocument | null) => void
  setDraftResume: (document: ResumeDocument | null) => void
  setGeneratedResume: (resumeId: string | null, jsonKey: string | null) => void
  setGeneratedFileBaseName: (value: string) => void
  setSelectedTemplateId: (templateId: string) => void
  setTailoringMode: (mode: TailoringMode) => void
  setTargetRole: (value: string) => void
  setTargetCompany: (value: string) => void
  setJobDescription: (value: string) => void
  setLastGenerateJob: (job: JobState | CreateJobResponse | null) => void
  setLastRenderJob: (job: JobState | null) => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
