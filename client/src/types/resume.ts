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

export type ProjectEntry = {
  name: string
  description?: string
  role?: string
  technologies: string[]
  url?: string
  start_date?: string | null
  end_date?: string | null
  bullets: string[]
}

export type CertificationEntry = {
  name: string
  issuer?: string
  date_obtained?: string | null
  expiration_date?: string | null
  url?: string
}
export type SkillCategory = {
  category: string
  items: string[]
}

export type AiImprovement = {
  category:
    | 'summary'
    | 'experience'
    | 'ats'
    | 'skills'
    | 'structure'
    | 'clarity'
    | 'keywords'
    | 'metrics'
    | 'projects'
    | 'education'
    | 'certifications'
    | 'formatting'
    | string
  title: string
  description: string
  details?: string[]
  evidence?: string
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
  projects?: ProjectEntry[]
  certifications?: CertificationEntry[]
  skills: SkillCategory[]
  ai_improvements?: AiImprovement[]
  metadata?: Record<string, string>
  created_at?: string
  updated_at?: string
}

export type RewriteTarget = {
  path: string
  instruction: string
}
