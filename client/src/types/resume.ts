export type ExperienceEntry = {
  company: string
  role: string
  start_date?: string | null
  end_date?: string | null
  bullets: string[]
}

export type EducationEntry = {
  institution: string
  degree: string
  field_of_study?: string
  start_date?: string | null
  end_date?: string | null
  gpa?: string
  description?: string
}

export type ResumeDocument = {
  resume_id: string
  full_name: string
  email: string
  phone: string
  links: string[]
  summary: string
  experience: ExperienceEntry[]
  education?: EducationEntry[]
  skills: string[]
  metadata?: Record<string, string>
  created_at?: string
  updated_at?: string
}

export type RewriteTarget = {
  path: string
  instruction: string
}
