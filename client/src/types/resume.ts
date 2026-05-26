export type ExperienceEntry = {
  company: string
  role: string
  start_date?: string | null
  end_date?: string | null
  bullets: string[]
}

export type ResumeDocument = {
  resume_id: string
  full_name: string
  email: string
  phone: string
  links: string[]
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
