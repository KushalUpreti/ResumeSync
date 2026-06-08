import type { FlowStep } from '../components/FlowStepper'

export const flowSteps: FlowStep[] = [
  { step: 1, label: 'Config', to: '/config' },
  { step: 2, label: 'Ingest', to: '/ingest' },
  { step: 3, label: 'Review', to: '/review' },
  { step: 4, label: 'Export', to: '/export' },
]

export const providerCards = [
  {
    name: 'Google Gemini',
    model: 'Gemini 3.1 Flash Lite',
    description:
      'High-throughput engine with a generous free tier and simple API key setup.',
    badges: ['Preferred', 'Free tier', 'Easiest setup'],
    selected: true,
  },
  {
    name: 'OpenAI',
    model: 'GPT-4o & GPT-3.5 Turbo',
    description:
      'Industry standard for high-precision entity extraction and complex formatting tasks.',
    badges: ['Fast'],
    selected: false,
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
    name: 'AWS Bedrock',
    model: 'Amazon Nova 1 & 2',
    description:
      'Amazon Nova models on Bedrock for teams that prefer IAM, VPC, and cloud-native controls.',
    badges: ['AWS', 'Private'],
    selected: false,
  },
]

export const templates = [
  { title: 'Modern', description: 'Best for Tech & Design', accent: 'linear-gradient(145deg, #284a60, #17202c)', imgSrc: '/modern.png', image: '/template.png' },
  { title: 'Executive', description: 'Best for Leadership', accent: 'linear-gradient(145deg, #355a6a, #1d2a36)', selected: true, imgSrc: '/executive.png', image: '/template.png' },
  { title: 'Professional', description: 'Best for Corporate', accent: 'linear-gradient(145deg, #f1f3f6, #dce3ea)', imgSrc: '/professional.png', image: '/template.png' },
]
