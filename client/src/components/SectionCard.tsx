import type { CSSProperties, ReactNode } from 'react'

type SectionCardProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

function SectionCard({ children, className, style }: SectionCardProps) {
  return (
    <section className={className ? `section-card ${className}` : 'section-card'} style={style}>
      {children}
    </section>
  )
}

export default SectionCard
