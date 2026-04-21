type LandingPageProps = {
  onTryNow: () => void
  onOpenSignUp: () => void
}

function LandingPage({ onTryNow, onOpenSignUp }: LandingPageProps) {
  return (
    <main className="hero-page">
      <section className="hero-card">
        <p className="eyebrow">Human-led resume optimization</p>
        <h1>Make every resume draft sharper, faster, and easier to trust.</h1>
        <p className="summary">
          ResumeSync helps you upload a resume, target a role, review
          AI-generated edits, and keep the final claims grounded in your own
          voice.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={onTryNow} type="button">
            Try it now
          </button>
          <button className="ghost-button" onClick={onOpenSignUp} type="button">
            Create account
          </button>
        </div>
        <div className="hero-points">
          <span>Upload a resume</span>
          <span>Choose Polisher or Sniper</span>
          <span>Review before export</span>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
