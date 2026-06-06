import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowUpRightFromSquare,
  faAsterisk,
  faBullseye,
  faCloud,
  faFingerprint,
  faShieldHalved,
  faWaveSquare,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

type LandingPageProps = {
  isLoggedIn: boolean;
};

const modules = [
  {
    icon: faAsterisk,
    mode: "polisher",
    title: "THE POLISHER",
    copy: "Synthesizes linguistic precision and tonal alignment. Optimized for executive clarity and semantic resonance across all ATS platforms.",
    stats: [
      ["+42%", "MATCH RATE"],
      ["8.4s", "LATENCY"],
    ],
  },
  {
    icon: faBullseye,
    mode: "sniper",
    title: "THE SNIPER",
    copy: "Targeted keyword extraction and role-specific calibration. Maps your trajectory directly onto job descriptions with lethal accuracy.",
    stats: [
      ["98%", "RELEVANCE"],
      ["INSTANT", "SYNTHESIS"],
    ],
  },
];

const workflow = [
  {
    step: "01",
    title: "Setup",
    copy: "Choose your goal, template, and target role.",
    image: "/landing-review-mockup.png",
  },
  {
    step: "02",
    title: "Import",
    copy: "Add your resume or paste your professional history.",
    image: "/landing/ingestion.png",
  },
  {
    step: "03",
    title: "Review",
    copy: "Edit tailored sections with side-by-side context.",
    image: "/landing/review.png",
  },
  {
    step: "04",
    title: "Export",
    copy: "Download a polished resume when it is ready.",
    image: "/landing/export.png",
  },
];

const infrastructure = [
  {
    icon: faCloud,
    title: "Reliable processing",
    copy: "Built to handle resume generation quickly and consistently.",
  },
  {
    icon: faShieldHalved,
    title: "Protected workspace",
    copy: "Your resume data is handled with care from import through export.",
  },
  {
    icon: faWaveSquare,
    title: "Clear version history",
    copy: "Keep track of changes as you refine your resume for each opportunity.",
  },
];

function LandingPage({ isLoggedIn }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  useEffect(() => {
    document.title = "ResumeSync AI - Engineered results.";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Build, tailor, review, and export a polished resume without wrestling with formatting or rewriting every bullet from scratch."
      );
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content =
        "Build, tailor, review, and export a polished resume without wrestling with formatting or rewriting every bullet from scratch.";
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal-on-scroll"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { threshold: 0.12 },
    );

    for (const element of revealElements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const particles = Array.from({ length: 70 }, () => ({
      x: 0,
      y: 0,
      size: 0,
      speedX: 0,
      speedY: 0,
    }));

    const resetParticle = (particle: (typeof particles)[number]) => {
      particle.x = Math.random() * canvas.width;
      particle.y = Math.random() * canvas.height;
      particle.size = Math.random() * 1.2 + 0.4;
      particle.speedX = (Math.random() - 0.5) * 0.28;
      particle.speedY = (Math.random() - 0.5) * 0.28;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles.forEach(resetParticle);
    };

    resize();
    window.addEventListener("resize", resize);

    let animationFrame = 0;
    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (const particle of particles) {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x > canvas.width) particle.x = 0;
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.y > canvas.height) particle.y = 0;
        if (particle.y < 0) particle.y = canvas.height;

        context.fillStyle = "rgba(15, 23, 42, 0.11)";
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      for (let index = 0; index < particles.length; index += 1) {
        for (
          let nextIndex = index + 1;
          nextIndex < particles.length;
          nextIndex += 1
        ) {
          const dx = particles[index].x - particles[nextIndex].x;
          const dy = particles[index].y - particles[nextIndex].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            context.strokeStyle = `rgba(15, 23, 42, ${0.045 * (1 - distance / 120)})`;
            context.lineWidth = 0.5;
            context.beginPath();
            context.moveTo(particles[index].x, particles[index].y);
            context.lineTo(particles[nextIndex].x, particles[nextIndex].y);
            context.stroke();
          }
        }
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const mockup = mockupRef.current;
    if (!mockup) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const x = (window.innerWidth / 2 - event.clientX) / 90;
      const y = (window.innerHeight / 2 - event.clientY) / 110;
      mockup.style.setProperty("--mockup-tilt-x", `${6 + y}deg`);
      mockup.style.setProperty("--mockup-tilt-y", `${-13 + x}deg`);
      mockup.style.setProperty("--mockup-tilt-z", "3deg");
    };

    const resetTilt = () => {
      mockup.style.removeProperty("--mockup-tilt-x");
      mockup.style.removeProperty("--mockup-tilt-y");
      mockup.style.removeProperty("--mockup-tilt-z");
    };

    window.addEventListener("pointermove", handlePointerMove);
    mockup.addEventListener("pointerleave", resetTilt);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      mockup.removeEventListener("pointerleave", resetTilt);
    };
  }, []);

  return (
    <main className="industrial-landing">
      <canvas aria-hidden="true" className="sync-node-canvas" ref={canvasRef} />
      <div className="scanline" aria-hidden="true" />
      <section className="industrial-hero" aria-labelledby="landing-title">
        <div className="landing-orbit landing-orbit--one" aria-hidden="true">
          <span />
        </div>
        <div className="landing-orbit landing-orbit--two" aria-hidden="true">
          <span />
        </div>
        <div className="industrial-hero__copy reveal-on-scroll">
          <p className="industrial-label">ResumeSync AI</p>
          <h1 id="landing-title">
            Engineered
            <span>results.</span>
          </h1>
          <p className="industrial-copy">
            Build, tailor, review, and export a polished resume without
            wrestling with formatting or rewriting every bullet from scratch.
          </p>
          <div className="industrial-actions">
            <Link
              className="industrial-button industrial-button--dark"
              to="/process"
            >
              {isLoggedIn ? "Open workspace" : "Get started"}
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <a
              className="industrial-button industrial-button--light"
              href="#platform"
            >
              See workflow
            </a>
          </div>
          <div className="landing-signal-row" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div
          className="industrial-hero__visual reveal-on-scroll"
          aria-label="ResumeSync dashboard preview"
          style={{ transitionDelay: "120ms" }}
        >
          <div className="actual-mockup-card">
            <img
              alt="ResumeSync review workspace showing original resume and optimized output"
              src="/landing/review.png"
            />
          </div>
        </div>
      </section>

      <section
        className="industrial-section industrial-section--modules"
        id="features"
      >
        <div className="industrial-section__header reveal-on-scroll">
          <div>
            <p className="industrial-kicker">Core features</p>
            <h2>Choose how you want to improve your resume</h2>
          </div>
          <p>Built for focused, practical edits.</p>
        </div>
        <div className="module-grid">
          {modules.map((module, index) => (
            <Link
              aria-label={`Start with ${module.title}`}
              className="industrial-card module-card reveal-on-scroll"
              to={`/process?step=ingestion&mode=${module.mode}`}
              key={module.title}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="module-card__top">
                <FontAwesomeIcon icon={module.icon} />
                <FontAwesomeIcon
                  aria-hidden="true"
                  className="module-card__arrow"
                  icon={faArrowUpRightFromSquare}
                />
              </div>
              <h3>{module.title}</h3>
              <p>{module.copy}</p>
              <dl>
                {module.stats.map(([value, label]) => (
                  <div key={label}>
                    <dt>{value}</dt>
                    <dd>{label}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          ))}
        </div>
      </section>

      <section
        className="industrial-section industrial-section--workflow"
        id="platform"
      >
        <div className="reveal-on-scroll">
          <p className="industrial-kicker">Workflow</p>
          <h2>From first draft to final export</h2>
        </div>
        <div className="workflow-showcase">
          <div className="workflow-line">
            <div className="workflow-line__progress" aria-hidden="true" />
            {workflow.map(({ step, title, copy }, index) => (
              <article
                aria-current={activeWorkflowStep === index ? "step" : undefined}
                className={`workflow-step${
                  activeWorkflowStep === index ? " is-active" : ""
                }`}
                key={step}
                onClick={() => setActiveWorkflowStep(index)}
                onFocus={() => setActiveWorkflowStep(index)}
                onMouseEnter={() => setActiveWorkflowStep(index)}
                tabIndex={0}
              >
                <span>{step}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>

          <div
            className="workflow-preview reveal-on-scroll"
            aria-label={`${workflow[activeWorkflowStep].title} workflow preview`}
            style={{ transitionDelay: "160ms" }}
          >
            <div className="workflow-preview__shell">
              {workflow.map(({ image, title }, index) => (
                <img
                  alt={`${title} screen preview`}
                  className={`workflow-preview__image${
                    activeWorkflowStep === index ? " is-active" : ""
                  }`}
                  key={image}
                  src={image}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="industrial-section reliability-section"
        id="enterprise"
      >
        <div className="reliability-section__copy reveal-on-scroll">
          <p className="industrial-kicker">Workspace</p>
          <h2>Designed for steady, confident editing</h2>
          <div className="reliability-list">
            {infrastructure.map((item) => (
              <article key={item.title}>
                <FontAwesomeIcon icon={item.icon} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div
          className="workspace-animated-mockup reveal-on-scroll"
          aria-label="Animated workspace preview"
          style={{ transitionDelay: "120ms" }}
        >
          <div className="system-window system-window--workspace" ref={mockupRef}>
            <div className="system-window__chrome">
              <span />
              <span />
              <span />
              <small>Resume workspace</small>
            </div>
            <div className="system-window__screen">
              <div className="screen-grid screen-grid--top">
                <span />
                <span />
                <span />
              </div>
              <div className="screen-panel screen-panel--wide">
                <strong>Candidate Signal</strong>
                <div className="micro-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="screen-panel">
                <strong>Role Match</strong>
                <em>98%</em>
              </div>
              <div className="screen-panel">
                <strong>Keyword Delta</strong>
                <em>+42</em>
              </div>
              <div className="screen-graph">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="screen-core">
                <FontAwesomeIcon icon={faFingerprint} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="industrial-cta reveal-on-scroll" id="pricing">
        <p className="industrial-kicker">Ready when you are</p>
        <h2>Build a resume you can send with confidence.</h2>
        <p>
          Start with what you have, shape it for the role you want, and export a
          clean final version.
        </p>
        <div className="industrial-actions industrial-actions--center">
          <Link
            className="industrial-button industrial-button--dark"
            to="/process"
          >
            Get started
          </Link>
          <a
            className="industrial-button industrial-button--light"
            href="#platform"
          >
            View workflow
          </a>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
