import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faPenToSquare,
  faPlus,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { Link, useLocation } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import SectionCard from '../components/SectionCard'
import { flowSteps, strategicKeywords } from '../data/mockData'

function ReviewPage() {
  const location = useLocation()

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <FlowStepper currentPath={location.pathname} steps={flowSteps} />
        <div className="page-toolbar__actions">
          <button className="button button--ghost" type="button">
            Save Draft
          </button>
          <Link className="button button--primary" to="/export">
            Approve & Continue
          </Link>
        </div>
      </div>

      <div className="review-grid">
        <SectionCard className="review-panel">
          <div className="section-card__header section-card__header--split">
            <h2 className="section-card__title">Original Resume Source</h2>
            <span className="tag tag--neutral">PDF: alex_smith_resume.pdf</span>
          </div>

          <div className="review-section">
            <p className="section-label">Experience</p>
            <div className="resume-block">
              <h3>Senior Product Designer @ TechFlow</h3>
              <p className="resume-block__date">Jan 2020 - Present</p>
              <p className="section-copy">
                Led the design of multiple B2B platforms. Managed a team of 4 designers.
                Improved user retention by significant margin. Used Figma and React daily.
                Collaborated with stakeholders.
              </p>
            </div>
          </div>

          <div className="review-section">
            <p className="section-label">Education</p>
            <div className="resume-block">
              <h3>B.S. in Design, Stanford University</h3>
              <p className="resume-block__date">2014 - 2018</p>
            </div>
          </div>

          <div className="review-section">
            <p className="section-label">Skills</p>
            <div className="tag-row">
              <span className="tag tag--neutral">UX Design</span>
              <span className="tag tag--neutral">Visual Design</span>
              <span className="tag tag--neutral">Strategy</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="review-panel review-panel--dark">
          <div className="review-scorebar">
            <div>
              <div className="review-title-row">
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                <h2 className="review-panel__title">AI Optimized Output</h2>
              </div>
              <p className="tag tag--success">ATS Optimized</p>
            </div>
            <div className="metrics-row">
              <div>
                <span>Match Score</span>
                <strong>94%</strong>
              </div>
              <div>
                <span>Keyword Hit</span>
                <strong>18/20</strong>
              </div>
              <div>
                <span>Readability</span>
                <strong>Expert</strong>
              </div>
            </div>
          </div>

          <div className="optimized-card">
            <div className="optimized-card__header">
              <p className="section-label">Optimized Experience</p>
              <button className="icon-action" type="button">
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
            </div>
            <div className="optimized-card__body">
              <h3>Senior Product Designer | Lead Experience Strategy</h3>
              <p className="resume-block__date">TechFlow | Jan 2020 - Present</p>
              <ul className="review-list">
                <li>
                  <span className="review-list__icon">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                  Orchestrated the design system evolution for 4 enterprise platforms,
                  resulting in a <strong>24% increase in user retention</strong> and 15%
                  reduction in churn.
                </li>
                <li>
                  <span className="review-list__icon">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                  Mentored a high-performing team of 4 designers, implementing
                  <strong> Agile Design workflows</strong> that decreased development
                  handoff cycles by 30%.
                </li>
                <li>
                  <span className="review-list__icon">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                  Leveraged <strong>Figma, React, and Storybook</strong> to bridge the gap
                  between design and engineering, ensuring 98% design-to-code fidelity.
                </li>
              </ul>
              <div className="review-tooltip">Suggest replacement | ESC to cancel</div>
            </div>
          </div>

          <div className="review-section">
            <p className="section-label">Strategic Keywords Added</p>
            <div className="tag-row">
              {strategicKeywords.map((keyword) => (
                <span className="tag tag--soft-blue" key={keyword}>
                  {keyword} <FontAwesomeIcon icon={faPlus} />
                </span>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default ReviewPage
