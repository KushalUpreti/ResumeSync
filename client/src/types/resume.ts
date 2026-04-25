export type ExperienceEntry = {
  company: string
  role: string
  bullets: string[]
}

export type ResumeDocument = {
  resume_id: string
  summary: string
  experience: ExperienceEntry[]
  skills: string[]
  metadata?: Record<string, string>
  created_at?: string
  updated_at?: string
}

export type RewriteTarget = {
  path: string
  instruction: string
}
