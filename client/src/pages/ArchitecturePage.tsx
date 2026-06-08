import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAws } from "@fortawesome/free-brands-svg-icons";
import {
  faArrowRight,
  faBolt,
  faBoxesStacked,
  faBrain,
  faCloud,
  faCodeBranch,
  faDatabase,
  faDiagramProject,
  faFileLines,
  faGear,
  faLayerGroup,
  faLock,
  faServer,
  faShieldHalved,
  faTimeline,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

const systemNodes = [
  {
    id: "client",
    label: "React + Vite",
    detail: "Workspace UI, local guest session, Cognito sign-in, BYOK headers.",
    aws: "Cognito hosted auth when signed in",
    icon: faUser,
    tone: "coral",
  },
  {
    id: "api",
    label: "FastAPI Controller",
    detail: "Validates auth, creates upload URLs, queues jobs, reads status.",
    aws: "ECS Fargate API behind an ALB",
    icon: faServer,
    tone: "ink",
  },
  {
    id: "queue",
    label: "SQS Queue",
    detail: "Local queue in dev, SQS in AWS. Heavy work leaves the API.",
    aws: "Amazon SQS absorbs async work",
    icon: faTimeline,
    tone: "gold",
  },
  {
    id: "worker",
    label: "Worker Engine",
    detail: "Parses sources, runs AI, rewrites JSON, renders docx outputs.",
    aws: "ECS Fargate worker service scales on queue depth",
    icon: faGear,
    tone: "mint",
  },
  {
    id: "storage",
    label: "S3 Object Store",
    detail: "S3 or local files for uploads, resume JSON, outputs, job state.",
    aws: "Amazon S3 stores temp files, JSON, docx, and job state",
    icon: faDatabase,
    tone: "violet",
  },
  {
    id: "llm",
    label: "LiteLLM + Prompts",
    detail: "OpenAI, Anthropic, Gemini, and Bedrock adapters through BYOK.",
    aws: "Amazon Bedrock is one supported model provider",
    icon: faBrain,
    tone: "cyan",
  },
];

const sourcePaths = [
  ["New upload", "S3 temp upload", "SQS generate job", "Worker tailors JSON"],
  ["Master resume", "S3 master JSON", "SQS generate job", "Worker tailors JSON"],
  ["Previous resume", "S3 resume JSON", "SQS generate job", "Worker tailors JSON"],
  ["Notes only", "API source_notes", "SQS generate job", "Worker tailors JSON"],
];

const jobTypes = [
  {
    title: "Generate",
    copy: "Converges every source through SQS into one AI tailoring pipeline and stores resume JSON in S3.",
    icon: faBolt,
  },
  {
    title: "Rewrite",
    copy: "Targets specific resume paths such as experience bullets, then persists the updated S3 JSON.",
    icon: faCodeBranch,
  },
  {
    title: "Commit",
    copy: "Accepts the full edited document and updates the S3-backed source of truth.",
    icon: faShieldHalved,
  },
  {
    title: "Render",
    copy: "Loads JSON from S3, fills a docxtpl template, and writes the final .docx output to S3.",
    icon: faFileLines,
  },
];

const storageKeys = [
  ["S3 temporary uploads", "temp/{session_or_user_id}/..."],
  ["S3 master resume", "users/{user_id}/master/master.json"],
  ["S3 source of truth", "users/{user_id}/json/{resume_id}.json"],
  ["S3 rendered document", "users/{user_id}/outputs/{resume_id}.docx"],
  ["S3 job state ledger", "jobs/{job_id}.json"],
];

const awsServices = [
  ["Amazon Cognito", "JWT verification and account-backed resume history"],
  ["Application Load Balancer", "Public traffic entrypoint for the API service"],
  ["ECS Fargate", "Separate API and worker tasks from the same image"],
  ["Amazon SQS", "Async job boundary for generate, rewrite, commit, and render"],
  ["Amazon S3", "Object store plus polling-friendly job-state ledger"],
  ["AWS Amplify", "Frontend hosting and delivery path for the React app"],
];

const runtimeLanes = [
  {
    title: "Experience Layer",
    copy: "Users configure providers, upload sources, and review structured output.",
    nodeIds: ["client", "api"],
  },
  {
    title: "Async Processing Layer",
    copy: "The API stays responsive while queue-backed workers handle expensive work.",
    nodeIds: ["queue", "worker"],
  },
  {
    title: "Persistence + Intelligence Layer",
    copy: "S3 holds the source of truth while LiteLLM routes provider calls, including Bedrock.",
    nodeIds: ["storage", "llm"],
  },
];

function ArchitecturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeNode, setActiveNode] = useState(systemNodes[0].id);

  useEffect(() => {
    document.title = "ResumeSync AI Architecture";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * ratio);
      canvas.height = Math.floor(canvas.clientHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      frame += 1;
      context.clearRect(0, 0, width, height);

      context.lineWidth = 1;
      for (let x = 0; x < width; x += 36) {
        context.strokeStyle = x % 72 === 0 ? "rgba(15, 23, 42, 0.1)" : "rgba(15, 23, 42, 0.045)";
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y < height; y += 36) {
        context.strokeStyle = y % 72 === 0 ? "rgba(15, 23, 42, 0.1)" : "rgba(15, 23, 42, 0.045)";
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
        const gradient = context.createLinearGradient(offset, y, offset + 180, y);
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

      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const selectedNode = systemNodes.find((node) => node.id === activeNode) ?? systemNodes[0];

  return (
    <main className="architecture-page">
      <section className="architecture-hero" aria-labelledby="architecture-title">
        <canvas className="architecture-hero__canvas" ref={canvasRef} aria-hidden="true" />
        <div className="architecture-hero__copy">
          <p className="architecture-kicker">System Architecture</p>
          <h1 id="architecture-title">AWS architecture built to scale resume generation.</h1>
          <p>
            ResumeSync separates resume intelligence from document formatting:
            the browser configures the run, FastAPI controls the request,
            workers transform structured JSON, and docx files are generated
            only when the final version is ready.
          </p>
          <div className="architecture-hero__actions">
            <Link className="architecture-command architecture-command--primary" to="/process">
              Open workspace
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <a className="architecture-command" href="#flow">
              Trace the system
            </a>
          </div>
        </div>
        <div className="architecture-console" aria-label="Architecture console">
          <div className="architecture-console__bar">
            <span />
            <span />
            <span />
            <strong>job_state: complete</strong>
          </div>
          <div className="architecture-console__body">
            <code>{`{
  "truth": "resume.json",
  "controller": "FastAPI",
  "queue": "Amazon SQS",
  "store": "Amazon S3",
  "compute": "ECS Fargate"
}`}</code>
          </div>
        </div>
      </section>

      <section className="architecture-section architecture-system" id="flow" aria-labelledby="system-map-title">
        <div className="architecture-section__header">
          <p className="architecture-kicker">Runtime Map</p>
          <h2 id="system-map-title">A clean left-to-right runtime flow</h2>
          <p>
            Click any step to inspect how the real codebase maps local adapters
            onto AWS services in production.
          </p>
        </div>

        <div className="architecture-map">
          <div className="architecture-map__stage" aria-label="Interactive architecture map">
            <div className="architecture-flow">
              {runtimeLanes.map((lane, laneIndex) => (
                <section className="architecture-flow__lane" key={lane.title}>
                  <div className="architecture-flow__lane-header">
                    <span>{String(laneIndex + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{lane.title}</h3>
                      <p>{lane.copy}</p>
                    </div>
                  </div>
                  <div className="architecture-flow__lane-nodes">
                    {lane.nodeIds.map((nodeId) => {
                      const node = systemNodes.find((item) => item.id === nodeId) ?? systemNodes[0];
                      return (
                        <button
                          className={`architecture-node architecture-node--${node.tone}${activeNode === node.id ? " is-active" : ""}`}
                          key={node.id}
                          onClick={() => setActiveNode(node.id)}
                          type="button"
                        >
                          <FontAwesomeIcon icon={node.icon} />
                          <strong>{node.label}</strong>
                          <em>
                            <FontAwesomeIcon icon={faAws} />
                            {node.aws}
                          </em>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div className="architecture-aws-ribbon" aria-label="AWS services used by runtime flow">
              <span><FontAwesomeIcon icon={faAws} /> AWS production path</span>
              <strong>Cognito</strong>
              <strong>ALB</strong>
              <strong>ECS Fargate</strong>
              <strong>SQS</strong>
              <strong>S3</strong>
              <strong>Bedrock</strong>
            </div>
          </div>
          <aside className={`architecture-inspector architecture-inspector--${selectedNode.tone}`}>
            <span>Selected module</span>
            <h3>{selectedNode.label}</h3>
            <p>{selectedNode.detail}</p>
            <div className="architecture-inspector__aws">
              <FontAwesomeIcon icon={faAws} />
              <strong>{selectedNode.aws}</strong>
            </div>
            <dl>
              <div>
                <dt>Boundary</dt>
                <dd>{selectedNode.id === "api" ? "Stateless request control" : selectedNode.id === "worker" ? "Background execution" : selectedNode.id === "queue" ? "Async workload isolation" : "Swappable adapter layer"}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd>{selectedNode.id === "storage" ? "S3 object keys + JSON documents" : selectedNode.id === "queue" ? "JobEnvelope payloads over SQS" : "Typed Pydantic/TypeScript payloads"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="architecture-section architecture-truth" aria-labelledby="truth-title">
        <div className="architecture-section__header">
          <p className="architecture-kicker">Core Principle</p>
          <h2 id="truth-title">The system never edits a docx as truth</h2>
        </div>
        <div className="truth-grid">
          <div className="truth-panel truth-panel--json">
            <FontAwesomeIcon icon={faLayerGroup} />
            <h3>JSON Source</h3>
            <p>Parsing, tailoring, review, rewrite, history, and autosave all operate on structured resume documents stored in S3.</p>
          </div>
          <div className="truth-transform" aria-hidden="true">
            <span />
            <FontAwesomeIcon icon={faArrowRight} />
            <span />
          </div>
          <div className="truth-panel truth-panel--docx">
            <FontAwesomeIcon icon={faFileLines} />
            <h3>docx Output</h3>
            <p>Templates are filled at export time by the ECS worker, creating a clean S3-backed file without entangling layout with AI logic.</p>
          </div>
        </div>
      </section>

      <section className="architecture-section architecture-lanes" aria-labelledby="lanes-title">
        <div className="architecture-section__header">
          <p className="architecture-kicker">Generation Sources</p>
          <h2 id="lanes-title">Four sources converge into the same AI pipeline</h2>
        </div>
        <div className="source-lanes">
          {sourcePaths.map((path) => (
            <article className="source-lane" key={path[0]}>
              {path.map((label, index) => (
                <div className="source-lane__cell" key={label}>
                  <span>{index + 1}</span>
                  <strong>{label}</strong>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="architecture-section architecture-jobs" aria-labelledby="jobs-title">
        <div className="architecture-section__header">
          <p className="architecture-kicker">Worker Jobs</p>
          <h2 id="jobs-title">Background work is queued, observable, and replaceable</h2>
        </div>
        <div className="job-grid">
          {jobTypes.map((job) => (
            <article className="job-card" key={job.title}>
              <FontAwesomeIcon icon={job.icon} />
              <h3>{job.title}</h3>
              <p>{job.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="architecture-section architecture-storage" aria-labelledby="storage-title">
        <div className="architecture-section__header">
          <p className="architecture-kicker">Amazon S3 Ledger</p>
          <h2 id="storage-title">S3 stores objects and job state</h2>
          <p>
            Local development mirrors this structure on disk, but production
            uses Amazon S3 for uploads, JSON truth, rendered documents, and
            polling-friendly job state.
          </p>
        </div>
        <div className="storage-ledger">
          {storageKeys.map(([label, key]) => (
            <div className="storage-ledger__row" key={label}>
              <span>{label}</span>
              <code>{key}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="architecture-section architecture-deploy" aria-labelledby="deploy-title">
        <div>
          <p className="architecture-kicker">Deployment Shape</p>
          <h2 id="deploy-title">One backend image, two ECS services</h2>
          <p>
            Local adapters mirror the cloud topology. Flip the service container
            to AWS mode and the same API and worker flow moves from file-backed
            storage and queueing to S3, SQS, Cognito, and ECS Fargate.
          </p>
        </div>
        <div className="deploy-strip" aria-label="Deployment services">
          <span><FontAwesomeIcon icon={faBoxesStacked} /> ECR image</span>
          <span><FontAwesomeIcon icon={faServer} /> API service</span>
          <span><FontAwesomeIcon icon={faGear} /> Worker service</span>
          <span><FontAwesomeIcon icon={faCloud} /> S3 + SQS</span>
          <span><FontAwesomeIcon icon={faLock} /> Cognito</span>
          <span><FontAwesomeIcon icon={faDiagramProject} /> ALB</span>
        </div>
      </section>

      <section className="architecture-section architecture-aws" aria-labelledby="aws-title">
        <div className="architecture-section__header">
          <p className="architecture-kicker">AWS Service Map</p>
          <h2 id="aws-title">Cloud services are first-class architecture pieces</h2>
        </div>
        <div className="aws-service-grid">
          {awsServices.map(([name, copy]) => (
            <article className="aws-service-card" key={name}>
              <FontAwesomeIcon icon={faAws} />
              <h3>{name}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ArchitecturePage;
