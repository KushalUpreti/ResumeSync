import type { ReactNode } from 'react'

type SectionCardProps = {
  children: ReactNode
  className?: string
}

function SectionCard({ children, className }: SectionCardProps) {
  return <section className={className ? `section-card ${className}` : 'section-card'}>{children}</section>
}

export default SectionCard
