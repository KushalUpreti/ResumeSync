import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faBullseye,
  faChartLine,
  faDatabase,
  faRocket,
  faShieldHalved,
  faSyncAlt,
} from '@fortawesome/free-solid-svg-icons'
import { Link } from 'react-router-dom'
import SectionCard from '../components/SectionCard'

type LandingPageProps = {
  isLoggedIn: boolean
  onOpenSignUp: () => void
}

const featureCards = [
  {
    title: 'Semantic Extraction',
    copy: 'Our engine maps your experience to industry-standard taxonomies used by Workday and Greenhouse.',
  },
  {
    title: 'Bias Neutralization',
    copy: 'AI-driven auditing identifies and corrects subtle patterns that might trigger algorithmic filtering.',
  },
  {
    title: 'Impact Quantifier',
    copy: 'Automatically translates vague tasks into data-backed metrics that grab attention instantly.',
  },
]

const modeCards = [
  {
    label: 'Mode 01',
    title: 'The Polisher',
    copy: 'The grounded choice. Refines your existing content for maximum clarity, tone consistency, and grammatical precision without changing your core narrative.',
    bullets: ['Precision tone adjustment', 'Grammar & syntax scrubbing', 'Clarity & conciseness focus'],
    cta: 'Select Polisher',
    icon: faShieldHalved,
  },
  {
    label: 'Mode 02',
    title: 'The Sniper',
    copy: 'The FAANG-ready choice. Heavy-duty job targeting. We rewrite your bullets based on specific job descriptions to force-align with company values.',
    bullets: ['Job-specific keyword injection', 'Metric-focused bullet generation', 'Company culture alignment'],
    cta: 'Select Sniper',
    featured: true,
    icon: faBullseye,
  },
]

function LandingPage({ isLoggedIn, onOpenSignUp }: LandingPageProps) {
  return (
    <div className="page-stack landing-stack">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Version 2.4.0 live</p>
          <h1 className="page-title">
            Engineered Resumes for
            <br />
            Elite Career Results
          </h1>
          <p className="page-copy">
            Precision-engineered career documentation powered by enterprise-grade AI
            orchestration. Optimize for high-stakes ATS algorithms while maintaining
            technical authority throughout your BYOK architecture.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary" to="/ingest">
              {isLoggedIn ? 'Open Workspace' : 'Get Started'}
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <button className="button button--ghost" onClick={onOpenSignUp} type="button">
              How It Works
            </button>
          </div>
          <div className="hero-infra">
            <div>
              <p className="section-label">Enterprise-grade infrastructure</p>
              <span className="hero-infra__icon">
                <FontAwesomeIcon icon={faShieldHalved} />
              </span>
              <span>BYOK security</span>
              <small>Client-managed encryption.</small>
            </div>
            <div>
              <span className="hero-infra__icon">
                <FontAwesomeIcon icon={faDatabase} />
              </span>
              <span>S3 persistence</span>
              <small>Triple-redundant storage.</small>
            </div>
            <div>
              <span className="hero-infra__icon">
                <FontAwesomeIcon icon={faRocket} />
              </span>
              <span>Fargate compute</span>
              <small>Isolated serverless processing.</small>
            </div>
          </div>
        </div>

        <SectionCard className="hero-preview">
          <div className="hero-preview__header">
            <div>
              <span className="hero-preview__badge">
                <FontAwesomeIcon icon={faSyncAlt} />
              </span>
              <strong>ResumeSync_v2.5 Final</strong>
              <p>Last synced: 02m ago</p>
            </div>
            <span>...</span>
          </div>
          <div className="hero-preview__score">
            <div className="hero-preview__score-label">
              <span>ATS Optimization Score</span>
              <strong>98%</strong>
            </div>
            <div className="hero-preview__bar">
              <span />
            </div>
          </div>
          <div className="hero-preview__metrics">
            <div>
              <span>Parsing depth</span>
              <strong>High</strong>
            </div>
            <div>
              <span>Latency</span>
              <strong>14ms</strong>
            </div>
          </div>
          <div className="hero-preview__notice">
            <strong>AES-256 Encryption Active</strong>
            <p>
              Secure tunnel established for BYOK data stream. Fargate instance running in
              VPC isolation.
            </p>
          </div>
        </SectionCard>
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <h2>Defeating the ATS Black Hole</h2>
          <p>
            Modern recruiters do not read resumes first. Their algorithms do. If your
            syntax is not engineered for parsing, your expertise never reaches a human eye.
          </p>
        </div>
        <div className="feature-grid">
          {featureCards.map((feature) => (
            <SectionCard key={feature.title}>
              <h3>{feature.title}</h3>
              <p className="section-copy">{feature.copy}</p>
            </SectionCard>
          ))}
        </div>
      </section>

      <section className="mode-showcase">
        {modeCards.map((mode) => (
          <SectionCard
            className={mode.featured ? 'mode-panel is-featured' : 'mode-panel'}
            key={mode.title}
          >
            <div className="mode-panel__top">
              <p className="section-label">{mode.label}</p>
              {mode.featured ? <span className="tag tag--dark">Popular</span> : null}
            </div>
            <h3>{mode.title}</h3>
            <p className="section-copy">{mode.copy}</p>
            <ul className="clean-list">
              {mode.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <Link
              className={
                mode.featured
                  ? 'button button--primary button--full'
                  : 'button button--ghost button--full'
              }
              to="/ingest"
            >
              <FontAwesomeIcon icon={mode.icon} />
              {mode.cta}
            </Link>
          </SectionCard>
        ))}
      </section>

      <section className="capability-grid">
        <SectionCard className="capability-grid__large">
          <h3>Enterprise Grade Infrastructure</h3>
          <p className="section-copy">
            Built on AWS Fargate for ephemeral, isolated execution environments. Your
            data never touches a persistent disk.
          </p>
        </SectionCard>
        <SectionCard>
          <h3>LLM Agnostic</h3>
          <p className="section-copy">Switch between GPT-4o, Claude 3.5, and Gemini Pro.</p>
        </SectionCard>
        <SectionCard>
          <div className="capability-icon">
            <FontAwesomeIcon icon={faShieldHalved} />
          </div>
          <h3>AES-256</h3>
          <p className="section-copy">Encryption</p>
        </SectionCard>
        <SectionCard>
          <div className="capability-icon">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <h3>&lt; 200ms</h3>
          <p className="section-copy">Latency</p>
        </SectionCard>
      </section>

      <section className="cta-band">
        <p className="section-label">Ready to Sync?</p>
        <h2>Join 15,000+ engineers who have upgraded their careers with ResumeSync AI.</h2>
        <div className="cta-band__actions">
          <Link className="button button--light" to="/ingest">
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
