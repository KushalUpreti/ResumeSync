import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileArrowDown,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import TemplateCard from '../components/TemplateCard'
import { flowSteps, templates } from '../data/mockData'

function ExportPage() {
  const location = useLocation()

  return (
    <div className="page-stack">
      <FlowStepper currentPath={location.pathname} steps={flowSteps} />

      <section className="page-intro page-intro--split">
        <div>
          <p className="eyebrow">Step 4 / Final Export</p>
          <h1 className="page-title page-title--medium">Choose Your Template</h1>
          <p className="page-copy">
            Select a layout optimized by our AI for your specific industry and experience
            level. You can switch templates at any time.
          </p>
        </div>
        <div className="page-intro__actions">
          <button className="button button--ghost" type="button">
            <FontAwesomeIcon icon={faFileArrowDown} />
            Download .docx
          </button>
          <button className="button button--primary" type="button">
            <FontAwesomeIcon icon={faFilePdf} />
            Export to PDF
          </button>
        </div>
      </section>

      <div className="template-grid">
        {templates.map((template) => (
          <TemplateCard
            accent={template.accent}
            description={template.description}
            isSelected={template.selected}
            key={template.title}
            title={template.title}
          />
        ))}
      </div>

      <section className="selected-template-bar">
        <div className="selected-template-bar__info">
          <div className="selected-template-bar__icon">
            <div className="template-sheet template-sheet--tiny" />
          </div>
          <div>
            <p className="section-label">Selected Template</p>
            <h3>Executive (Premium)</h3>
          </div>
        </div>
        <div className="selected-template-bar__actions">
          <button className="button button--ghost" type="button">
            <FontAwesomeIcon icon={faFileArrowDown} />
            Download .docx
          </button>
          <button className="button button--primary" type="button">
            <FontAwesomeIcon icon={faFilePdf} />
            Download PDF
          </button>
        </div>
      </section>
    </div>
  )
}

export default ExportPage
