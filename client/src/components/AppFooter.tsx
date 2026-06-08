import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function AppFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__intro">
          <p className="site-footer__eyebrow">Built for focused applications</p>
          <div className="site-footer__brand">ResumeSync AI</div>
          <p className="site-footer__note">
            A resume workspace for turning rough experience into tailored,
            reviewable, export-ready documents without losing control of the
            final voice.
          </p>
        </div>

        <div className="site-footer__creator">
          <p className="site-footer__creator-label">Created by</p>
          <a
            className="site-footer__creator-name"
            href="https://kushalupreti.com.np/"
            target="_blank"
            rel="noreferrer"
          >
            Kushal Upreti
          </a>
          <div className="site-footer__socials" aria-label="Creator links">
            <a
              href="https://github.com/KushalUpreti/ResumeSync"
              target="_blank"
              rel="noreferrer"
              aria-label="ResumeSync on GitHub"
            >
              <FontAwesomeIcon icon={faGithub} />
            </a>
            <a
              href="https://www.linkedin.com/in/kushal-upreti-55240912a/"
              target="_blank"
              rel="noreferrer"
              aria-label="Kushal Upreti on LinkedIn"
            >
              <FontAwesomeIcon icon={faLinkedin} />
            </a>
            <a
              href="https://kushalupreti.com.np/"
              target="_blank"
              rel="noreferrer"
              aria-label="Kushal Upreti website"
            >
              <FontAwesomeIcon icon={faGlobe} />
            </a>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>ResumeSync AI</span>
          <span>Designed for clarity, speed, and confident iteration.</span>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
