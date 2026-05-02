import type { FlowStep } from '../components/FlowStepper'

export const flowSteps: FlowStep[] = [
  { step: 1, label: 'Config', to: '/config' },
  { step: 2, label: 'Ingest', to: '/ingest' },
  { step: 3, label: 'Review', to: '/review' },
  { step: 4, label: 'Export', to: '/export' },
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
    model: 'Gemini 3.1 Flash Lite',
    description:
      'High-throughput engine optimized for speed and parallel resume processing.',
    badges: ['High Speed', 'Large context'],
    selected: false,
  },
]

export const templates = [
  { title: 'Modern', description: 'Best for Tech & Design', accent: 'linear-gradient(145deg, #284a60, #17202c)' },
  { title: 'Executive', description: 'Best for Leadership', accent: 'linear-gradient(145deg, #355a6a, #1d2a36)', selected: true },
  { title: 'Professional', description: 'Best for Corporate', accent: 'linear-gradient(145deg, #f1f3f6, #dce3ea)' },
  { title: 'Creative', description: 'Best for Arts & Media', accent: 'linear-gradient(145deg, #2f3846, #fd6a3b)' },
  { title: 'Minimalist', description: 'Best for Any Industry', accent: 'linear-gradient(145deg, #2d4353, #7e9aaa)' },
  { title: 'Academic', description: 'Best for Researchers', accent: 'linear-gradient(145deg, #314454, #d7d9de)' },
]

