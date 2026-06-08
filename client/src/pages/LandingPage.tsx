import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowUpRightFromSquare,
  faAsterisk,
  faBullseye,
  faCloud,
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
    copy: "Delivers clear, precise language with a polished tone from rough career notes. Structured for executive readability and full compatibility with ATS systems.",
    stats: [
      ["+42%", "MATCH RATE"],
      ["Sub 3s", "LATENCY"],
    ],
  },
  {
    icon: faBullseye,
    mode: "sniper",
    title: "THE SNIPER",
    copy: "Identifies the most relevant keywords and calibrates your resume for the specific role. Aligns your background to job descriptions with exceptional precision.",
    stats: [
      ["98%", "RELEVANCE"],
      ["INSTANT", "SYNTHESIS"],
    ],
  },
];

function hasConfiguredApiKey() {
  return Boolean(localStorage.getItem("ai_api_key")?.trim());
}

function getModulePath(mode: string) {
  const step = hasConfiguredApiKey() ? "ingestion" : "config";
  return `/process?step=${step}&mode=${mode}`;
}

const problemSolutions = [
  {
    painLabel: "Pain point 01",
    painTitle: "ATS rules feel invisible",
    painCopy:
      "Beginners are told to make resumes ATS friendly without knowing what that actually means.",
    solutionLabel: "Solution",
    solutionTitle: "Plain-language ingestion",
    solutionCopy:
      "Paste rough notes, drafts, or existing resume text and shape it into an ATS-aware resume with guided structure.",
    signal: "ATS alignment active",
    icon: faAsterisk,
  },
  {
    painLabel: "Pain point 02",
    painTitle: "Good prompts are hard to write",
    painCopy:
      "Generic AI output usually comes from vague instructions, missing context, and untested resume prompts.",
    solutionLabel: "Solution",
    solutionTitle: "Curated resume engines",
    solutionCopy:
      "Polisher and Sniper modes use purpose-built prompt flows tuned for broad polish or role-specific targeting.",
    signal: "Prompt stack curated",
    icon: faBullseye,
  },
  {
    painLabel: "Pain point 03",
    painTitle: "Every version takes time",
    painCopy:
      "Updating each resume by hand means reworking bullets, keywords, formatting, and exports over and over.",
    solutionLabel: "Solution",
    solutionTitle: "Review, diff, improve",
    solutionCopy:
      "Compare generated changes, inspect improvements, refine sections, and export when the version is ready.",
    signal: "Diff review enabled",
    icon: faWaveSquare,
  },
  {
    painLabel: "Pain point 04",
    painTitle: "Generated resumes get lost",
    painCopy:
      "It is hard to keep track of which resume was made for which job, model, or draft cycle.",
    solutionLabel: "Solution",
    solutionTitle: "Workspace history",
    solutionCopy:
      "Recently processed resumes stay organized so you can return to prior outputs instead of starting from scratch.",
    signal: "History indexed",
    icon: faCloud,
  },
  {
    painLabel: "Pain point 05",
    painTitle: "Trust is part of the workflow",
    painCopy:
      "AI tools can feel risky when keys, resume data, and generated documents move through unclear systems.",
    solutionLabel: "Solution",
    solutionTitle: "BYOK control",
    solutionCopy:
      "Bring your own frontier model key, keep it in your browser, send requests over encrypted HTTPS, and export fast.",
    signal: "Local key control",
    icon: faShieldHalved,
  },
];

const workflow = [
  {
    step: "01",
    title: "Setup",
    copy: "Choose your frontier models and bring in your API keys.",
    image: "/landing/models.png",
  },
  {
    step: "02",
    title: "Import",
    copy: "Add your resume or paste your professional history. Pick from various sources.",
    image: "/landing/ingestion.png",
  },
  {
    step: "03",
    title: "Review",
    copy: "Edit tailored sections with side-by-side diff viewer to see changes.",
    image: "/landing/review.png",
  },
  {
    step: "04",
    title: "View Enhancements",
    copy: "View AI made enhancements in detail. See what was improved.",
    image: "/landing/improvements.png",
  },
  {
    step: "05",
    title: "Export",
    copy: "Download a polished resume in different modern ATS friendly formats.",
    image: "/landing/export.png",
  },
];

function LandingPage({ isLoggedIn }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const problemSectionRef = useRef<HTMLDivElement>(null);
  const workflowSectionRef = useRef<HTMLElement>(null);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  useEffect(() => {
    document.title = "ResumeSync AI - Engineered results.";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Shape a polished, role-ready resume without fighting formatting or starting from scratch. Take control of your career outcome.",
      );
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content =
        "Shape a polished, role-ready resume without fighting formatting or starting from scratch. Take control of your career outcome.";
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

    let frame = 0;
    const particles = Array.from({ length: 70 }, () => ({
      x: 0,
      y: 0,
      size: 0,
      speedX: 0,
      speedY: 0,
    }));

    const resetParticle = (particle: (typeof particles)[number]) => {
      particle.x = Math.random() * canvas.clientWidth;
      particle.y = Math.random() * canvas.clientHeight;
      particle.size = Math.random() * 1.2 + 0.4;
      particle.speedX = (Math.random() - 0.5) * 0.28;
      particle.speedY = (Math.random() - 0.5) * 0.28;
    };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * ratio);
      canvas.height = Math.floor(canvas.clientHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles.forEach(resetParticle);
    };

    resize();
    window.addEventListener("resize", resize);

    let animationFrame = 0;
    const animate = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      frame += 1;

      context.clearRect(0, 0, width, height);

      context.lineWidth = 1;
      for (let x = 0; x < width; x += 36) {
        context.strokeStyle =
          x % 72 === 0 ? "rgba(15, 23, 42, 0.1)" : "rgba(15, 23, 42, 0.045)";
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      for (let y = 0; y < height; y += 36) {
        context.strokeStyle =
          y % 72 === 0 ? "rgba(15, 23, 42, 0.1)" : "rgba(15, 23, 42, 0.045)";
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const beams = [
        ["#f97316", 0.14, 0.78],
        ["#06b6d4", 0.24, 0.56],
        ["#84cc16", 0.38, 0.7],
        ["#7c3aed", 0.18, 0.36],
      ] as const;

      beams.forEach(([color, yRatio, speed], index) => {
        const y = height * yRatio + Math.sin((frame + index * 50) / 45) * 16;
        const offset = ((frame * speed + index * 130) % (width + 180)) - 180;
        const gradient = context.createLinearGradient(
          offset,
          y,
          offset + 180,
          y,
        );
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, "transparent");
        context.strokeStyle = gradient;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(offset, y);
        context.lineTo(offset + 180, y);
        context.stroke();
      });

      for (const particle of particles) {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x > width) particle.x = 0;
        if (particle.x < 0) particle.x = width;
        if (particle.y > height) particle.y = 0;
        if (particle.y < 0) particle.y = height;

        context.fillStyle = "rgba(15, 23, 42, 0.07)";
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
            context.strokeStyle = `rgba(15, 23, 42, ${
              0.032 * (1 - distance / 120)
            })`;
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
    const section = problemSectionRef.current;
    if (!section) {
      return;
    }

    let animationFrame = 0;

    const updateActiveProblem = () => {
      const rows = Array.from(
        section.querySelectorAll<HTMLElement>(".problem-solution__row"),
      );
      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      rows.forEach((row, index) => {
        const rect = row.getBoundingClientRect();
        const rowCenter = rect.top + rect.height / 2;
        const distance = Math.abs(rowCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveProblemIndex(closestIndex);
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveProblem);
    };

    updateActiveProblem();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  useEffect(() => {
    const section = workflowSectionRef.current;
    if (!section) {
      return;
    }

    let animationFrame = 0;

    const updateActiveWorkflowStep = () => {
      const rect = section.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const activationStart = rect.height * 0.48;
      const activationDistance = rect.height * 0.48;
      const progress = Math.min(
        1,
        Math.max(
          0,
          (viewportCenter - rect.top - activationStart) / activationDistance,
        ),
      );
      const nextStep = Math.min(
        workflow.length - 1,
        Math.floor(progress * workflow.length),
      );

      setActiveWorkflowStep(nextStep);
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveWorkflowStep);
    };

    updateActiveWorkflowStep();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
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
          <div className="hero-credit-pill" aria-label="Creator">
            <span />
            By Kushal Upreti
          </div>
          <h1 id="landing-title">
            Engineered
            <span>results.</span>
          </h1>
          <p className="industrial-copy">
            Shape a polished, role-ready resume without fighting formatting or
            starting from scratch. Take control of your career outcome.
          </p>
          <p className="industrial-copy-detail">
            Bring your own model key, add your resume or notes, review the
            changes, and export a clean ATS friendly document within seconds.
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
          <div className="landing-access-note" aria-label="Account access note">
            <span>No login required to export.</span>
            <p>
              Sign in only when you want to store your master resume and track
              past versions.
            </p>
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
        className="industrial-section industrial-section--problem-solution"
        aria-labelledby="problem-solution-title"
      >
        <div className="problem-solution__header reveal-on-scroll">
          <p className="industrial-kicker">Problems / Solutions</p>
          <h2 id="problem-solution-title">
            Built around the resume work people actually avoid
          </h2>
        </div>
        <div className="problem-solution" ref={problemSectionRef}>
          {problemSolutions.map((item, index) => (
            <article
              className={`problem-solution__row${
                activeProblemIndex === index ? " is-active" : ""
              }`}
              key={item.painTitle}
            >
              <div className="problem-card">
                <span>{item.painLabel}</span>
                <h3>{item.painTitle}</h3>
                <p>{item.painCopy}</p>
              </div>
              <div className="problem-solution__connector" aria-hidden="true">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
              <div className="solution-card">
                <div className="solution-card__label">
                  <span>{item.solutionLabel}</span>
                </div>
                <h3>{item.solutionTitle}</h3>
                <p>{item.solutionCopy}</p>
                <div className="solution-card__signal">
                  <FontAwesomeIcon icon={item.icon} />
                  <span>{item.signal}</span>
                </div>
              </div>
            </article>
          ))}
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
              to={getModulePath(module.mode)}
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
        ref={workflowSectionRef}
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
            className="workflow-preview"
            aria-label={`${workflow[activeWorkflowStep].title} workflow preview`}
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
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
