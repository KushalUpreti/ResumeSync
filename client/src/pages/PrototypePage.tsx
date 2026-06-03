import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBullseye,
  faDatabase,
  faRocket,
  faShieldHalved,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import SectionCard from "../components/SectionCard";

type PrototypePageProps = {
  isLoggedIn: boolean;
};

type FragmentSpec = {
  id: string;
  label: string;
  kind: "masthead" | "title" | "summary" | "metrics" | "sidebar" | "footer";
  from: { x: number; y: number; rotate: number };
  to: { x: number; y: number; rotate: number };
  size: { width: number; height: number };
  burstAt: number;
};

type Spark = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
  size: number;
  rotation: number;
};

type InfoCard = {
  title: string;
  copy: string;
  icon: typeof faBullseye;
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

const heroMetrics = [
  { label: "Latency", value: "0.02ms" },
  { label: "Accuracy", value: "99.9%" },
  { label: "Core", value: "V128" },
];

const heroRings = [
  { delay: "0s", size: 0 },
  { delay: "0.9s", size: 1 },
  { delay: "1.8s", size: 2 },
  { delay: "2.7s", size: 3 },
];

const fragments: FragmentSpec[] = [
  {
    id: "masthead",
    label: "Masthead",
    kind: "masthead",
    from: { x: 86, y: 64, rotate: -14 },
    to: { x: 176, y: 78, rotate: 0 },
    size: { width: 160, height: 22 },
    burstAt: 0.22,
  },
  {
    id: "title",
    label: "Headline",
    kind: "title",
    from: { x: 44, y: 144, rotate: 10 },
    to: { x: 156, y: 132, rotate: 0 },
    size: { width: 212, height: 96 },
    burstAt: 0.36,
  },
  {
    id: "summary",
    label: "Summary",
    kind: "summary",
    from: { x: 54, y: 264, rotate: -7 },
    to: { x: 156, y: 248, rotate: 0 },
    size: { width: 252, height: 72 },
    burstAt: 0.48,
  },
  {
    id: "metrics",
    label: "Metrics",
    kind: "metrics",
    from: { x: 560, y: 112, rotate: 9 },
    to: { x: 514, y: 120, rotate: 0 },
    size: { width: 134, height: 122 },
    burstAt: 0.62,
  },
  {
    id: "sidebar",
    label: "Role cards",
    kind: "sidebar",
    from: { x: 566, y: 262, rotate: -12 },
    to: { x: 504, y: 274, rotate: 0 },
    size: { width: 168, height: 154 },
    burstAt: 0.74,
  },
  {
    id: "footer",
    label: "Footer line",
    kind: "footer",
    from: { x: 136, y: 424, rotate: 6 },
    to: { x: 184, y: 418, rotate: 0 },
    size: { width: 332, height: 18 },
    burstAt: 0.84,
  },
];

const assemblyCards = [
  {
    title: "Source resume",
    copy: "Start with an existing resume draft, a master resume, or uploaded notes that capture the candidate's background.",
  },
  {
    title: "Targeted tailoring",
    copy: "Shape the content toward a specific role by emphasizing the right skills, experience, and keywords.",
  },
  {
    title: "Export-ready resume",
    copy: "Review the final document, refine it in context, and export a polished version that is ready to share.",
  },
];

const proofCards = [
  {
    title: "Visual clarity",
    value: "Crisp",
    copy: "Clean structure keeps the candidate story readable and easy to scan.",
    icon: faBullseye,
  },
  {
    title: "Assembly depth",
    value: "6 layers",
    copy: "Each section can be reviewed independently before the resume is exported as a whole.",
    icon: faDatabase,
  },
  {
    title: "Motion feel",
    value: "Smooth",
    copy: "The flow keeps the user moving from intake to review to export without unnecessary friction.",
    icon: faRocket,
  },
  {
    title: "Trust signal",
    value: "AES-256",
    copy: "The product keeps the security story visible while handling resume data and exports.",
    icon: faShieldHalved,
  },
];

const infoCards: InfoCard[] = [
  {
    title: "Structure",
    copy: "Sections stay organized so the resume reads cleanly from top to bottom.",
    icon: faBullseye,
    corner: "top-left",
  },
  {
    title: "Signal",
    copy: "The strongest achievements and skills stay visible during tailoring.",
    icon: faDatabase,
    corner: "top-right",
  },
  {
    title: "Velocity",
    copy: "Users can move quickly from source material to a finished export.",
    icon: faRocket,
    corner: "bottom-left",
  },
  {
    title: "Trust",
    copy: "The experience still feels polished, secure, and production-ready.",
    icon: faShieldHalved,
    corner: "bottom-right",
  },
];

const canvasWidth = 860;
const canvasHeight = 560;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function buildSparkBurst(idBase: number, x: number, y: number) {
  return Array.from({ length: 12 }).map((_, index) => {
    const angle = randomRange(-Math.PI, Math.PI);
    const speed = randomRange(80, 210);
    const ttl = randomRange(0.35, 0.82);

    return {
      id: idBase + index,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randomRange(40, 120),
      age: 0,
      ttl,
      size: randomRange(2.4, 5.4),
      rotation: randomRange(0, 360),
    } satisfies Spark;
  });
}

function PrototypePage({ isLoggedIn }: PrototypePageProps) {
  const [progress, setProgress] = useState(0);
  const [showInfoCards, setShowInfoCards] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const burstRef = useRef<Set<string>>(new Set());
  const sparkSeedRef = useRef(1);

  useEffect(() => {
    if (progress < 0.985) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowInfoCards(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [progress]);

  useEffect(() => {
    let raf = 0;
    let frameStart = 0;
    let lastTime = 0;

    const tick = (now: number) => {
      if (!frameStart) {
        frameStart = now;
        lastTime = now;
      }

      const raw = clamp((now - frameStart) / 3250, 0, 1);
      const eased = easeInOutCubic(raw);
      const delta = (now - lastTime) / 1000;

      if (raw < 0.03) {
        burstRef.current.clear();
      }

      const nextSparks: Spark[] = [];
      for (const spark of sparksRef.current) {
        const age = spark.age + delta;
        if (age >= spark.ttl) {
          continue;
        }

        nextSparks.push({
          ...spark,
          age,
          x: spark.x + spark.vx * delta,
          y: spark.y + spark.vy * delta,
          vx: spark.vx * 0.985,
          vy: spark.vy + 240 * delta,
        });
      }

      for (const fragment of fragments) {
        if (raw < fragment.burstAt || burstRef.current.has(fragment.id)) {
          continue;
        }

        burstRef.current.add(fragment.id);
        const burst = buildSparkBurst(
          sparkSeedRef.current,
          fragment.to.x + fragment.size.width / 2,
          fragment.to.y + fragment.size.height / 2,
        );
        sparkSeedRef.current += burst.length + 1;
        nextSparks.push(...burst);
      }

      sparksRef.current = nextSparks;
      setSparks(nextSparks);
      setProgress(eased);
      if (raw >= 0.985) {
        setShowInfoCards(true);
      }
      lastTime = now;

      if (raw < 1) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="page-stack prototype-shell prototype-shell--light">
      <section className="prototype-hero prototype-hero--light">
        <div className="prototype-hero__copy">
          <p className="eyebrow prototype-kicker">
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            Product demo / Resume workflow
          </p>
          <h1 className="page-title prototype-title">
            Turn a resume draft into
            <br />a polished export
          </h1>
          <p className="page-copy prototype-copy">
            ResumeSync helps users move from rough input to a tailored resume
            they can review, refine, and export with confidence.
          </p>
          <div className="hero-actions prototype-actions">
            <Link className="button button--primary" to="/process">
              {isLoggedIn ? "Open Workspace" : "Start Editing"}
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <Link className="button button--ghost" to="/">
              Back to homepage
            </Link>
          </div>
          <div className="prototype-pills">
            <span className="tag tag--dark">Light mode</span>
            <span className="tag tag--neutral">Tailor by role</span>
            <span className="tag tag--neutral">Review before export</span>
          </div>
        </div>

        <div className="prototype-stage">
          <div className="prototype-stage__header">
            <span>Resume preview</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="prototype-stage__canvas prototype-stage__canvas--light">
            <div className="prototype-stage__grid" aria-hidden="true" />
            <div className="prototype-stage__halo" aria-hidden="true" />

            <div className="prototype-stage__sparks" aria-hidden="true">
              {sparks.map((spark) => {
                const life = spark.age / spark.ttl;
                const opacity = 1 - life;
                return (
                  <span
                    className="prototype-spark"
                    key={spark.id}
                    style={{
                      left: `${spark.x}px`,
                      top: `${spark.y}px`,
                      width: `${spark.size}px`,
                      height: `${spark.size}px`,
                      opacity,
                      transform: `translate(-50%, -50%) rotate(${spark.rotation + spark.age * 240}deg)`,
                    }}
                  />
                );
              })}
            </div>

            <svg
              className="prototype-stage__svg"
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              role="img"
              aria-label="Resume preview"
            >
              <defs>
                <filter
                  id="softShadow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="18"
                    stdDeviation="18"
                    floodColor="#111827"
                    floodOpacity="0.12"
                  />
                </filter>
              </defs>

              <rect
                x="150"
                y="60"
                width="560"
                height="416"
                rx="28"
                fill="#ffffff"
                stroke="rgba(17,24,39,0.10)"
                strokeWidth="1.5"
                filter="url(#softShadow)"
              />

              <rect
                x="186"
                y="96"
                width="96"
                height="16"
                rx="8"
                fill="rgba(17,24,39,0.92)"
                opacity={clamp((progress - 0.08) / 0.4, 0, 1)}
              />

              <rect
                x="186"
                y="130"
                width="236"
                height="12"
                rx="6"
                fill="rgba(17,24,39,0.92)"
                opacity={clamp((progress - 0.28) / 0.34, 0, 1)}
              />
              <rect
                x="186"
                y="150"
                width="180"
                height="12"
                rx="6"
                fill="rgba(17,24,39,0.58)"
                opacity={clamp((progress - 0.32) / 0.34, 0, 1)}
              />

              <rect
                x="186"
                y="196"
                width="252"
                height="10"
                rx="5"
                fill="rgba(17,24,39,0.80)"
                opacity={clamp((progress - 0.42) / 0.24, 0, 1)}
              />
              <rect
                x="186"
                y="216"
                width="220"
                height="10"
                rx="5"
                fill="rgba(17,24,39,0.45)"
                opacity={clamp((progress - 0.46) / 0.22, 0, 1)}
              />
              <rect
                x="186"
                y="236"
                width="196"
                height="10"
                rx="5"
                fill="rgba(17,24,39,0.34)"
                opacity={clamp((progress - 0.5) / 0.2, 0, 1)}
              />

              <rect
                x="534"
                y="120"
                width="122"
                height="110"
                rx="18"
                fill="rgba(17,24,39,0.94)"
                opacity={clamp((progress - 0.6) / 0.16, 0, 1)}
              />
              <rect
                x="552"
                y="140"
                width="24"
                height="24"
                rx="7"
                fill="#ffffff"
                opacity={clamp((progress - 0.62) / 0.14, 0, 1)}
              />
              <rect
                x="552"
                y="180"
                width="84"
                height="8"
                rx="4"
                fill="#ffffff"
                opacity={clamp((progress - 0.64) / 0.12, 0, 1)}
              />
              <rect
                x="552"
                y="202"
                width="68"
                height="8"
                rx="4"
                fill="#ffffff"
                opacity={clamp((progress - 0.68) / 0.1, 0, 1)}
              />

              <rect
                x="520"
                y="268"
                width="146"
                height="150"
                rx="20"
                fill="rgba(17,24,39,0.06)"
                stroke="rgba(17,24,39,0.12)"
                opacity={clamp((progress - 0.72) / 0.16, 0, 1)}
              />
              <rect
                x="540"
                y="292"
                width="106"
                height="10"
                rx="5"
                fill="rgba(17,24,39,0.90)"
                opacity={clamp((progress - 0.76) / 0.1, 0, 1)}
              />
              <rect
                x="540"
                y="314"
                width="88"
                height="10"
                rx="5"
                fill="rgba(17,24,39,0.70)"
                opacity={clamp((progress - 0.8) / 0.08, 0, 1)}
              />
              <rect
                x="540"
                y="336"
                width="96"
                height="10"
                rx="5"
                fill="rgba(17,24,39,0.54)"
                opacity={clamp((progress - 0.82) / 0.08, 0, 1)}
              />

              <rect
                x="186"
                y="422"
                width="308"
                height="10"
                rx="5"
                fill="rgba(17,24,39,0.88)"
                opacity={clamp((progress - 0.84) / 0.1, 0, 1)}
              />
              <rect
                x="186"
                y="444"
                width="246"
                height="8"
                rx="4"
                fill="rgba(17,24,39,0.40)"
                opacity={clamp((progress - 0.86) / 0.08, 0, 1)}
              />

              {fragments.map((fragment) => {
                const local = clamp(
                  (progress - fragment.burstAt + 0.12) / 0.54,
                  0,
                  1,
                );
                const eased = easeInOutCubic(local);
                const x = lerp(fragment.from.x, fragment.to.x, eased);
                const y = lerp(fragment.from.y, fragment.to.y, eased);
                const rotate = lerp(
                  fragment.from.rotate,
                  fragment.to.rotate,
                  eased,
                );
                const opacity = clamp(local * 1.25, 0.14, 1);
                const scale = lerp(0.92, 1, eased);

                return (
                  <g
                    key={fragment.id}
                    transform={`translate(${x} ${y}) rotate(${rotate} ${fragment.size.width / 2} ${fragment.size.height / 2}) scale(${scale})`}
                    opacity={opacity}
                    filter="url(#softShadow)"
                  >
                    {fragment.kind === "masthead" ? (
                      <>
                        <rect
                          x="0"
                          y="3"
                          width="160"
                          height="18"
                          rx="9"
                          fill="#111827"
                        />
                        <rect
                          x="190"
                          y="7"
                          width="18"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.48)"
                        />
                      </>
                    ) : null}

                    {fragment.kind === "title" ? (
                      <>
                        <rect
                          x="0"
                          y="0"
                          width="212"
                          height="18"
                          rx="9"
                          fill="#111827"
                        />
                        <rect
                          x="0"
                          y="30"
                          width="180"
                          height="14"
                          rx="7"
                          fill="rgba(17,24,39,0.70)"
                        />
                        <rect
                          x="0"
                          y="54"
                          width="154"
                          height="14"
                          rx="7"
                          fill="rgba(17,24,39,0.46)"
                        />
                        <rect
                          x="0"
                          y="78"
                          width="132"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.28)"
                        />
                      </>
                    ) : null}

                    {fragment.kind === "summary" ? (
                      <>
                        <rect
                          x="0"
                          y="0"
                          width="252"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.84)"
                        />
                        <rect
                          x="0"
                          y="20"
                          width="228"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.52)"
                        />
                        <rect
                          x="0"
                          y="40"
                          width="214"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.42)"
                        />
                        <rect
                          x="0"
                          y="60"
                          width="170"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.30)"
                        />
                      </>
                    ) : null}

                    {fragment.kind === "metrics" ? (
                      <>
                        <rect
                          x="0"
                          y="0"
                          width="134"
                          height="122"
                          rx="18"
                          fill="#111827"
                        />
                        <rect
                          x="18"
                          y="20"
                          width="24"
                          height="24"
                          rx="7"
                          fill="#ffffff"
                        />
                        <rect
                          x="18"
                          y="58"
                          width="86"
                          height="8"
                          rx="4"
                          fill="#ffffff"
                          opacity="0.88"
                        />
                        <rect
                          x="18"
                          y="78"
                          width="70"
                          height="8"
                          rx="4"
                          fill="#ffffff"
                          opacity="0.68"
                        />
                        <rect
                          x="18"
                          y="98"
                          width="94"
                          height="8"
                          rx="4"
                          fill="#ffffff"
                          opacity="0.48"
                        />
                      </>
                    ) : null}

                    {fragment.kind === "sidebar" ? (
                      <>
                        <rect
                          x="0"
                          y="0"
                          width="168"
                          height="154"
                          rx="20"
                          fill="#ffffff"
                          stroke="rgba(17,24,39,0.10)"
                        />
                        <rect
                          x="18"
                          y="18"
                          width="124"
                          height="12"
                          rx="6"
                          fill="#111827"
                        />
                        <rect
                          x="18"
                          y="42"
                          width="116"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.58)"
                        />
                        <rect
                          x="18"
                          y="62"
                          width="132"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.40)"
                        />
                        <rect
                          x="18"
                          y="92"
                          width="98"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.30)"
                        />
                        <rect
                          x="18"
                          y="118"
                          width="76"
                          height="10"
                          rx="5"
                          fill="rgba(17,24,39,0.22)"
                        />
                      </>
                    ) : null}

                    {fragment.kind === "footer" ? (
                      <>
                        <rect
                          x="0"
                          y="0"
                          width="332"
                          height="18"
                          rx="9"
                          fill="#111827"
                        />
                      </>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {showInfoCards ? (
              <div className="prototype-stage__overlays" aria-hidden="true">
                {infoCards.map((card, index) => (
                  <article
                    className={`prototype-info-card prototype-info-card--overlay prototype-info-card--${card.corner}`}
                    key={card.title}
                    style={{
                      animationDelay: `${120 + index * 140}ms`,
                    }}
                  >
                    <span className="prototype-info-card__icon">
                      <FontAwesomeIcon icon={card.icon} />
                    </span>
                    <div className="prototype-info-card__body">
                      <h3>{card.title}</h3>
                      <p>{card.copy}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
          <div className="prototype-stage__footer">
            <strong>
              The workspace keeps the resume organized from intake through
              export.
            </strong>
            <p>
              Users can focus on the content, compare versions, and export the
              final resume without losing the underlying structure.
            </p>
          </div>
        </div>
      </section>

      <section className="prototype-assembly">
        <div className="section-heading prototype-section-heading prototype-section-heading--light">
          <p className="eyebrow">How it works</p>
          <h2>Move from source content to a finished resume</h2>
          <p>
            The workflow guides users through ingestion, configuration, review,
            and export so every resume stays easy to edit and easy to trust.
          </p>
        </div>
        <div className="prototype-assembly__grid">
          {assemblyCards.map((card, index) => (
            <SectionCard
              className="prototype-card prototype-card--light"
              key={card.title}
            >
              <p className="prototype-card__step">0{index + 1}</p>
              <h3>{card.title}</h3>
              <p className="section-copy">{card.copy}</p>
            </SectionCard>
          ))}
        </div>
      </section>

      <section className="prototype-proof">
        <div className="section-heading prototype-section-heading prototype-section-heading--light">
          <p className="eyebrow">Why teams use it</p>
          <h2>Designed for fast review and confident export</h2>
          <p>
            The interface stays bright and simple while still giving users the
            tools they need to tailor, review, and export a polished resume.
          </p>
        </div>
        <div className="prototype-proof__grid">
          {proofCards.map((card) => (
            <SectionCard
              className="prototype-proof-card prototype-proof-card--light"
              key={card.title}
            >
              <div className="prototype-proof-card__top">
                <span className="prototype-proof-card__icon">
                  <FontAwesomeIcon icon={card.icon} />
                </span>
                <strong>{card.value}</strong>
              </div>
              <h3>{card.title}</h3>
              <p className="section-copy">{card.copy}</p>
            </SectionCard>
          ))}
        </div>
      </section>
    </div>
  );
}

export default PrototypePage;
