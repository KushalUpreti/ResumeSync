import axios from 'axios'
import { apiClient } from './client'
import type {
  CreateGenerateJobRequest,
  CreateJobResponse,
  JobState,
  MasterResumeResponse,
  ResumeHistoryResponse,
  MasterResumeUploadRequest,
  RenderResumeRequest,
  ValidateAiKeyResponse,
  RewritePreviewRequest,
  RewritePreviewResponse,
  UploadUrlRequest,
  UploadUrlResponse,
} from '../types/api'
import type { ResumeDocument } from '../types/resume'

export async function requestUploadUrl(payload: UploadUrlRequest) {
  const response = await apiClient.post<UploadUrlResponse>('/upload-url', payload)
  return response.data
}

export async function validateAiKey() {
  const response = await apiClient.post<ValidateAiKeyResponse>('/ai/validate-key')
  return response.data
}

export async function uploadFileToPresignedUrl(uploadUrl: string, file: File, headers: Record<string, string>) {
  await axios.put(uploadUrl, file, {
    headers,
  })
}

export async function createGenerateJob(payload: CreateGenerateJobRequest) {
  const response = await apiClient.post<CreateJobResponse>('/jobs', payload)
  return response.data
}

export async function getJob(jobId: string) {
  const response = await apiClient.get<JobState>(`/jobs/${jobId}`)
  return response.data
}

export async function waitForJob(jobId: string, intervalMs = 2500) {
  while (true) {
    const job = await getJob(jobId)
    if (job.status === 'complete' || job.status === 'failed') {
      return job
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
  }
}

export async function uploadMasterResume(payload: MasterResumeUploadRequest) {
  const response = await apiClient.post<CreateJobResponse>('/master-resume', {
    input_s3_key: payload.input_s3_key,
    filename: payload.filename,
    content_type: payload.content_type ?? null,
  })
  return response.data
}

export async function getMasterResume() {
  const response = await apiClient.get<MasterResumeResponse>('/master-resume')
  return response.data
}

export async function getResumeHistory() {
  const response = await apiClient.get<ResumeHistoryResponse>('/resumes/history')
  return response.data
}

export async function getResume(resumeId: string) {
  const response = await apiClient.get<ResumeDocument>(`/resume/${resumeId}`)
  return response.data
}

export async function rewritePreview(payload: RewritePreviewRequest) {
  const response = await apiClient.post<RewritePreviewResponse>('/rewrite/preview', payload)
  return response.data
}

export async function commitResume(resumeId: string, document: ResumeDocument) {
  const response = await apiClient.post<CreateJobResponse>(`/resume/${resumeId}/commit`, {
    document,
  })
  return response.data
}

export async function renderResume(resumeId: string, payload: RenderResumeRequest) {
  const response = await apiClient.post<CreateJobResponse>(`/resume/${resumeId}/render`, payload)
  return response.data
}
