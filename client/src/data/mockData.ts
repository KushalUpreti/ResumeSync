import type { FlowStep } from '../components/FlowStepper'
import type { ResumeDocument } from '../types/resume'

export const flowSteps: FlowStep[] = [
  { step: 1, label: 'Config', to: '/config' },
  { step: 2, label: 'Ingest', to: '/ingest' },
  { step: 3, label: 'Review', to: '/review' },
  { step: 4, label: 'Export', to: '/export' },
]

export const mockMasterResume: ResumeDocument = {
  resume_id: 'master-123',
  summary: 'Experienced Software Engineer with a focus on React and Node.js. Passionate about building scalable web applications and improving developer experience.',
  experience: [
    {
      company: 'Tech Corp',
      role: 'Senior Software Engineer',
      bullets: [
        'Led a team of 5 developers to build a new dashboard.',
        'Improved build performance by 40% using Vite.',
        'Mentored junior engineers and conducted code reviews.',
      ],
    },
    {
      company: 'StartUp Inc',
      role: 'Full Stack Developer',
      bullets: [
        'Developed features for a high-traffic e-commerce site.',
        'Integrated third-party payment gateways.',
      ],
    },
  ],
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
}

export const mockDraftResume: ResumeDocument = {
  ...mockMasterResume,
  resume_id: 'draft-456',
  summary: 'Senior Frontend Engineer specialized in high-performance React architectures. Expert at optimizing user experiences and streamlining development workflows for enterprise-scale SaaS platforms.',
  experience: [
    {
      company: 'Tech Corp',
      role: 'Senior Software Engineer',
      bullets: [
        'Spearheaded the migration of legacy dashboards to a modern Design System, increasing UI consistency across 12 product modules.',
        'Optimized frontend build pipelines, reducing CI/CD wait times by 40% and accelerating feature delivery cycles.',
        'Established rigorous code quality standards and mentorship programs, fostering a high-performance engineering culture.',
      ],
    },
    {
      company: 'StartUp Inc',
      role: 'Full Stack Developer',
      bullets: [
        'Engineered responsive e-commerce interfaces handling 50k+ daily active users with sub-second load times.',
        'Architected seamless payment integrations using Stripe and PayPal, reducing checkout friction by 15%.',
      ],
    },
  ],
}

export const queuedFiles = [
  {
    id: 'resume-primary',
    name: 'main_resume_2024_v2.pdf',
    status: 'Processing 65%',
    meta: '2.4 MB',
    progress: 65,
  },
  {
    id: 'resume-archive',
    name: 'historical_archive_2021.docx',
    status: 'Ready',
    meta: '1.1 MB',
    progress: 100,
  },
]

export const providerCards = [
  {
    name: 'OpenAI',
    model: 'GPT-4o & GPT-3.5 Turbo',
    description:
      'Industry standard for high-precision entity extraction and complex formatting tasks.',
    badges: ['Recommended', 'Fast'],
    selected: true,
  },
  {
    name: 'Anthropic',
    model: 'Claude 3.5 Sonnet',
    description:
      'Exceptional at maintaining tone consistency and deep structural understanding.',
    badges: ['Accurate'],
    selected: false,
  },
  {
    name: 'Google Gemini',
    model: 'Gemini 1.5 Pro',
    description:
      'Massive context window ideal for batch processing hundreds of resumes simultaneously.',
    badges: ['Large context'],
    selected: false,
  },
]

export const strategicKeywords = [
  'Design Systems',
  'Stakeholder Mgmt',
  'Agile Design',
  'SaaS UX',
]

export const templates = [
  { title: 'Modern', description: 'Best for Tech & Design', accent: 'linear-gradient(145deg, #284a60, #17202c)' },
  { title: 'Executive', description: 'Best for Leadership', accent: 'linear-gradient(145deg, #355a6a, #1d2a36)', selected: true },
  { title: 'Professional', description: 'Best for Corporate', accent: 'linear-gradient(145deg, #f1f3f6, #dce3ea)' },
  { title: 'Creative', description: 'Best for Arts & Media', accent: 'linear-gradient(145deg, #2f3846, #fd6a3b)' },
  { title: 'Minimalist', description: 'Best for Any Industry', accent: 'linear-gradient(145deg, #2d4353, #7e9aaa)' },
  { title: 'Academic', description: 'Best for Researchers', accent: 'linear-gradient(145deg, #314454, #d7d9de)' },
]
