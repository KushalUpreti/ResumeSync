import type { ResumeDocument } from '../types/resume'

type ResumeSheetProps = {
  document: ResumeDocument | null
  title?: string
  subtitle?: string
  isLoading?: boolean
}

function ResumeSheet({ document, title, subtitle, isLoading }: ResumeSheetProps) {
  if (!document) {
    return (
      <div className="resume-sheet" style={{ display: 'grid', placeItems: 'center', color: '#cbd5e0' }}>
        <p>No draft data available to preview.</p>
      </div>
    )
  }

  return (
    <div className={`resume-sheet ${isLoading ? 'is-loading' : ''}`}>
      <header className="resume-sheet__header">
        <h2 className="resume-sheet__title">{title || 'Resume Preview'}</h2>
        <p className="resume-sheet__subtitle">{subtitle || 'Document Preview'}</p>
      </header>

      <div className="resume-sheet__body">
        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Professional Summary</h3>
          <p>{document.summary}</p>
        </section>

        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Experience</h3>
          {document.experience.map((exp, idx) => (
            <div className="resume-sheet__experience-item" key={idx}>
              <div className="resume-sheet__role-row">
                <strong>{exp.role}</strong>
                <span>{exp.company}</span>
              </div>
              <ul className="resume-sheet__bullets">
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="resume-sheet__section">
          <h3 className="resume-sheet__section-title">Skills</h3>
          <p>{document.skills.join(' • ')}</p>
        </section>
      </div>
    </div>
  )
}

export default ResumeSheet
