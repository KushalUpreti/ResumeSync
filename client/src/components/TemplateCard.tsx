import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'

type TemplateCardProps = {
  accent?: string
  description: string
  isSelected?: boolean
  title: string
}

function TemplateCard({
  accent = 'linear-gradient(145deg, #27485b 0%, #1c2733 100%)',
  description,
  isSelected = false,
  title,
}: TemplateCardProps) {
  return (
    <article className={isSelected ? 'template-card is-selected' : 'template-card'}>
      <div className="template-card__preview" style={{ background: accent }}>
        <div className="template-sheet">
          <div className="template-sheet__header" />
          <div className="template-sheet__columns">
            <div>
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
        {isSelected ? (
          <span className="template-card__flag">
            <FontAwesomeIcon icon={faCheckCircle} />
            Selected
          </span>
        ) : null}
      </div>
      <div className="template-card__content">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <button className={isSelected ? 'button button--accent' : 'button button--ghost'} type="button">
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </article>
  )
}

export default TemplateCard
