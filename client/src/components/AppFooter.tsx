function AppFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__intro">
        <div className="site-footer__brand">ResumeSync AI</div>
        <p className="site-footer__note">
          Definitive career optimization substrate. Engineered for speed,
          designed for clarity.
        </p>
      </div>
      <div className="site-footer__column">
        <span>RESOURCES</span>
        <a href="/#platform">Documentation</a>
        <a href="/#features">API Reference</a>
        <a href="/#enterprise">Status</a>
      </div>
      <div className="site-footer__column">
        <span>LEGAL</span>
        <a href="/#pricing">Privacy Policy</a>
        <a href="/#pricing">Terms of Service</a>
      </div>
      <div className="site-footer__column">
        <span>SYSTEM</span>
        <p>v1.0.4-STABLE</p>
        <p>©2026 RESUMESYNC AI</p>
      </div>
    </footer>
  );
}

export default AppFooter;
