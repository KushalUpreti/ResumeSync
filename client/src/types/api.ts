import type { ResumeDocument, RewriteTarget } from './resume'

export type UploadUrlRequest = {
  upload_type: 'resume_source' | 'master_resume'
  filename: string
  content_type: string
}

export type UploadUrlResponse = {
  upload_url: string
  object_key: string
  method: 'PUT'
  headers: Record<string, string>
}

export type JobState = {
  job_id: string
  status: 'pending' | 'processing' | 'complete' | 'failed'
  output_s3_key: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export type CreateGenerateJobRequest = {
  job_type: 'generate'
  mode: 'polisher' | 'sniper'
  source_type: 'new_upload' | 'master' | 'previous' | 'notes_only'
  template_id: string
  source_json_key?: string | null
  input_s3_key?: string | null
  source_notes?: string | null
  target_role?: string | null
  target_company?: string | null
  job_description?: string | null
}

export type CreateJobResponse = {
  job_id: string
  status: JobState['status']
}

export type MasterResumeUploadRequest = {
  input_s3_key: string
  filename: string
  content_type?: string | null
}

export type RewritePreviewRequest = {
  text: string
  instruction: string
  mode: 'polisher' | 'sniper'
}

export type RewritePreviewResponse = {
  rewritten_text: string
}

export type MasterResumeResponse = {
  exists: boolean
  document: ResumeDocument | null
}

export type ResumeHistoryItem = {
  resume_id: string
  json_key: string
  summary: string
  source_filename?: string | null
  updated_at: string
  created_at: string
}

export type ResumeHistoryResponse = {
  items: ResumeHistoryItem[]
}

export type ValidateAiKeyResponse = {
  valid: boolean
  provider: string
  model: string
}

export type RenderResumeRequest = {
  template_id: string
}

export type RewriteResumeRequest = {
  targets: RewriteTarget[]
}
