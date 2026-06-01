import { useEffect, useRef, useState, type DragEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowUp,
  faFileLines,
  faCircle,
  faCircleDot,
  faSpinner,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  createGenerateJob,
  getMasterResume,
  getResume,
  getResumeHistory,
  requestUploadUrl,
  uploadFileToPresignedUrl,
  uploadMasterResume,
  validateAiKey,
  waitForJob,
} from "../api/resumeSync";
import { getApiErrorMessage } from "../api/client";
import SectionCard from "../components/SectionCard";
import { useAuth } from "../context/useAuth";
import { useWorkspace } from "../context/useWorkspace";
import { useNotification } from "../context/useNotification";
import type { ResumeHistoryItem } from "../types/api";

type IngestionStepProps = {
  onNext: () => void;
};

const savedModes = [
  {
    value: "general",
    label: "General",
    description:
      "Build a balanced master resume that keeps the full career story intact.",
  },
  {
    value: "sniper",
    label: "Sniper",
    description:
      "Sharpen the resume toward the target role with stronger keyword and relevance matching.",
  },
] as const;

type SavedModeValue = (typeof savedModes)[number]["value"];

function IngestionStep({ onNext }: IngestionStepProps) {
  const { addNotification } = useNotification();
  const { auth } = useAuth();
  const {
    masterResume,
    setDraftResume,
    setMasterResume,
    setGeneratedResume,
    setLastGenerateJob,
    setTailoringMode,
    selectedTemplateId,
    tailoringMode,
    targetRole,
    targetCompany,
    jobDescription,
    setJobDescription,
  } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [useMasterResume, setUseMasterResume] = useState(true);
  const [selectedMode, setSelectedMode] = useState<SavedModeValue>(
    tailoringMode === "sniper" ? "sniper" : "general",
  );
  const [details, setDetails] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Upload your master resume to unlock authenticated backend flows.",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingReview, setIsPreparingReview] = useState(false);
  const [resumeHistory, setResumeHistory] = useState<ResumeHistoryItem[]>([]);
  const [selectedHistoryKey, setSelectedHistoryKey] = useState<string | null>(
    null,
  );
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }

    void (async () => {
      try {
        const response = await getMasterResume();
        if (response.exists && response.document) {
          setMasterResume(response.document);
          setDraftResume(response.document);
          setStatusMessage(
            "Loaded your existing master resume from the backend.",
          );
        } else {
          setMasterResume(null);
          setDraftResume(null);
          setStatusMessage(
            "Signed in successfully. Upload a master resume to start tailoring.",
          );
        }
        const historyResponse = await getResumeHistory();
        setResumeHistory(historyResponse.items);
      } catch {
        setMasterResume(null);
        setDraftResume(null);
        addNotification({
          type: "error",
          message: "Connection Failed",
          description:
            "We couldn't fetch your stored resume. Please upload a file to continue.",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  function handleFilePick(fileList: FileList | null) {
    const nextFile = fileList?.[0];
    if (!nextFile) {
      return;
    }

    setSelectedFile(nextFile);
    setSelectedHistoryKey(null);
  }

  function handleModeChange(mode: SavedModeValue) {
    setSelectedMode(mode);
    setTailoringMode(mode === "sniper" ? "sniper" : "polisher");
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    handleFilePick(event.dataTransfer.files);
  }

  const selectedModeData = savedModes.find(
    (mode) => mode.value === selectedMode,
  );

  async function handleProceed() {
    function deriveResumeIdFromJsonKey(jsonKey: string | null) {
      if (!jsonKey) return null;
      const match = jsonKey.match(/\/json\/([^/]+)\.json$/);
      return match?.[1] ?? null;
    }

    async function preflightValidateAi() {
      setStatusMessage("Validating AI credentials...");
      await validateAiKey();
    }

    async function generateAndLoadTailoredResume(source: {
      sourceType: "master" | "previous" | "notes_only";
      sourceJsonKey?: string | null;
    }) {
      setStatusMessage("Starting tailoring job...");
      const generateJob = await createGenerateJob({
        job_type: "generate",
        mode: tailoringMode,
        source_type: source.sourceType,
        template_id: selectedTemplateId,
        source_json_key: source.sourceJsonKey ?? null,
        source_notes: details.trim() || null,
        target_role: targetRole || null,
        target_company: targetCompany || null,
        job_description: jobDescription || null,
      });
      setLastGenerateJob(generateJob);
      setStatusMessage("Tailoring your resume. This can take a few moments...");
      const finalJob = await waitForJob(generateJob.job_id);
      setLastGenerateJob(finalJob);
      if (finalJob.status === "failed") {
        throw new Error(finalJob.error || "The tailoring job failed.");
      }

      const newResumeId = deriveResumeIdFromJsonKey(finalJob.output_s3_key);
      if (!newResumeId) {
        throw new Error("Tailoring completed, but no resume id was returned.");
      }
      const tailoredDoc = await getResume(newResumeId);
      setGeneratedResume(newResumeId, finalJob.output_s3_key);
      setDraftResume(tailoredDoc);
    }

    const hasNotes = Boolean(details.trim());
    const hasHistory = Boolean(selectedHistoryKey);
    const hasMaster = Boolean(masterResume && useMasterResume);
    const hasFile = Boolean(selectedFile);

    const isNotesOnly = !selectedFile && !hasMaster && !hasHistory && hasNotes;

    if (tailoringMode === "sniper") {
      if (!jobDescription?.trim()) {
        addNotification({
          type: "warning",
          message: "Job Description Required",
          description:
            "Sniper mode requires a target job description to align your resume.",
        });
        return;
      }
      if (isNotesOnly) {
        addNotification({
          type: "warning",
          message: "Resume Required",
          description:
            "Sniper mode requires a resume to be uploaded or selected.",
        });
        return;
      }
    }

    if (!hasFile && !hasMaster && !hasHistory && !hasNotes) {
      addNotification({
        type: "warning",
        message: "No Source Information",
        description:
          "Please upload a resume file or enter details in the ingestion notes to proceed.",
      });
      return;
    }

    if (isNotesOnly) {
      setIsSaving(true);
      setIsPreparingReview(true);
      try {
        await preflightValidateAi();
        await generateAndLoadTailoredResume({ sourceType: "notes_only" });
        onNext();
      } catch (error) {
        addNotification({
          type: "error",
          message: "Failed to Start Tailoring",
          description: getApiErrorMessage(
            error,
            "Could not complete resume tailoring.",
          ),
        });
      } finally {
        setIsPreparingReview(false);
        setIsSaving(false);
      }
      return;
    }

    if (hasHistory && !selectedFile) {
      setIsSaving(true);
      setIsPreparingReview(true);
      try {
        await preflightValidateAi();
        await generateAndLoadTailoredResume({
          sourceType: "previous",
          sourceJsonKey: selectedHistoryKey,
        });
        onNext();
      } catch (error) {
        addNotification({
          type: "error",
          message: "Failed to Start Tailoring",
          description: getApiErrorMessage(
            error,
            "Could not complete resume tailoring.",
          ),
        });
      } finally {
        setIsPreparingReview(false);
        setIsSaving(false);
      }
      return;
    }

    // If they already have a master resume and didn't select a new one, submit the job and proceed.
    if (!selectedFile && hasMaster) {
      setIsSaving(true);
      setIsPreparingReview(true);
      try {
        await preflightValidateAi();
        await generateAndLoadTailoredResume({ sourceType: "master" });
        onNext();
      } catch (error) {
        addNotification({
          type: "error",
          message: "Failed to Start Tailoring",
          description: getApiErrorMessage(
            error,
            "Could not complete resume tailoring.",
          ),
        });
      } finally {
        setIsPreparingReview(false);
        setIsSaving(false);
      }
      return;
    }

    if (!selectedFile) {
      addNotification({
        type: "warning",
        message: "No Source Selected",
        description:
          "Please choose a resume file or enter details in the ingestion notes.",
      });
      return;
    }

    setIsSaving(true);
    setIsPreparingReview(true);
    setStatusMessage("Requesting a secure upload URL from the backend...");

    try {
      await preflightValidateAi();
      const upload = await requestUploadUrl({
        upload_type: "master_resume",
        filename: selectedFile.name,
        content_type: selectedFile.type || "application/octet-stream",
      });

      await uploadFileToPresignedUrl(
        upload.upload_url,
        selectedFile,
        upload.headers,
      );
      setStatusMessage("Upload complete. Parsing your master resume...");

      const parseJob = await uploadMasterResume({
        input_s3_key: upload.object_key,
        filename: selectedFile.name,
        content_type: selectedFile.type || null,
      });
      const job = await waitForJob(parseJob.job_id);
      if (job.status === "failed") {
        throw new Error(job.error || "The master resume parse job failed.");
      }

      const master = await getMasterResume();
      if (!master.exists || !master.document) {
        throw new Error(
          "The worker completed, but no master resume JSON was returned.",
        );
      }

      setMasterResume(master.document);
      setDraftResume(master.document);
      await generateAndLoadTailoredResume({ sourceType: "master" });
      onNext();
    } catch (error) {
      addNotification({
        type: "error",
        message: "Upload Failed",
        description: getApiErrorMessage(
          error,
          "Unable to upload the master resume.",
        ),
      });
    } finally {
      setIsPreparingReview(false);
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      {isPreparingReview ? (
        <div
          className="generation-backdrop"
          role="status"
          aria-live="polite"
          aria-label="Preparing your tailored resume"
        >
          <div className="generation-backdrop__card">
            <FontAwesomeIcon icon={faSpinner} spin />
            <h2>Preparing Your Review</h2>
            <p>{statusMessage}</p>
          </div>
        </div>
      ) : null}

      <section className="page-intro">
        <h1 className="page-title page-title--hero">Knowledge Ingestion</h1>
        <p className="page-copy">
          Feed your AI persona with raw professional data for hyper-personalized
          resume generation.
        </p>
      </section>

      <div className="dashboard-grid">
        <div className="stack-column">
          <SectionCard>
            <div className="section-card__header section-card__header--inline">
              <h2 className="section-card__title">Ingestion Mode</h2>
            </div>
            <div
              className="segmented-control"
              role="tablist"
              aria-label="Ingestion mode"
            >
              {savedModes.map((mode) => (
                <button
                  className={
                    selectedMode === mode.value
                      ? "segmented-control__item is-active"
                      : "segmented-control__item"
                  }
                  key={mode.value}
                  onClick={() => handleModeChange(mode.value)}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="section-copy">{selectedModeData?.description}</p>
          </SectionCard>

          <SectionCard>
            <div className="section-card__header section-card__header--inline">
              <h2 className="section-card__title">
                {selectedMode === "sniper"
                  ? "Job Description"
                  : "Ingestion Notes"}
              </h2>
            </div>
            <div className="vault-container">
              <textarea
                className="text-area vault-input"
                placeholder={
                  selectedMode === "sniper"
                    ? "Paste the target job description here (Required for Sniper mode)..."
                    : "Add extra context, accomplishments, or role-specific notes you want the LLM to consider during tailoring..."
                }
                value={selectedMode === "sniper" ? jobDescription : details}
                onChange={(event) =>
                  selectedMode === "sniper"
                    ? setJobDescription(event.target.value)
                    : setDetails(event.target.value)
                }
              />
              <button className="vault-action" type="button">
                <FontAwesomeIcon icon={faWandMagicSparkles} />
              </button>
            </div>
          </SectionCard>
        </div>

        <SectionCard>
          <div className="section-card__header">
            <h2 className="section-card__title">Primary Source Upload</h2>
            <p className="section-copy">
              Upload your latest PDF/DOCX resume for structural analysis.
            </p>
          </div>

          <label
            className={dragActive ? "upload-panel is-active" : "upload-panel"}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".doc,.docx,.pdf,.txt"
              onChange={(event) => handleFilePick(event.target.files)}
            />
            <div className="upload-panel__icon">
              <FontAwesomeIcon icon={faFileArrowUp} />
            </div>
            <strong>Drag and drop files</strong>
            <span>Support for PDF, DOCX, and TXT files up to 10MB.</span>
            <button
              className="button button--primary"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Select from Computer
            </button>
          </label>

          <div className="queue-block">
            <p className="section-label">Selected for Analysis</p>
            <div className="queue-list">
              {selectedFile ? (
                <article className="queue-item">
                  <div className="queue-item__meta">
                    <div className="queue-item__icon">
                      <FontAwesomeIcon icon={faFileLines} />
                    </div>
                    <div>
                      <h3>{selectedFile.name}</h3>
                      <p>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB /
                        Ready
                      </p>
                    </div>
                  </div>
                  <div className="queue-item__status">
                    <button
                      className="queue-item__remove"
                      onClick={() => setSelectedFile(null)}
                      type="button"
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                </article>
              ) : masterResume && useMasterResume ? (
                <article
                  className="queue-item"
                  style={{
                    borderColor: "var(--color-success)",
                    background: "rgba(15, 157, 108, 0.05)",
                  }}
                >
                  <div className="queue-item__meta">
                    <div
                      className="queue-item__icon"
                      style={{ color: "var(--color-success)" }}
                    >
                      <FontAwesomeIcon icon={faFileLines} />
                    </div>
                    <div>
                      <h3>Stored Master Resume</h3>
                      <p>Loaded from your account / Ready</p>
                    </div>
                  </div>
                  <div className="queue-item__status">
                    <button
                      className="queue-item__remove"
                      onClick={() => {
                        setUseMasterResume(false);
                        setMasterResume(null);
                      }}
                      type="button"
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                </article>
              ) : masterResume && !useMasterResume ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <p className="section-copy text-muted">
                    No file selected yet.
                  </p>
                  <button
                    className="button button--ghost"
                    onClick={() => setUseMasterResume(true)}
                    type="button"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Restore Master Resume
                  </button>
                </div>
              ) : (
                <p className="section-copy text-muted">No file selected yet.</p>
              )}
            </div>
          </div>

          {resumeHistory.length > 0 ? (
            <div className="resume-history">
              <p className="section-label">Recently Processed</p>
              <div className="resume-history__list">
                {resumeHistory.slice(0, 4).map((item) => (
                  <button
                    className={
                      selectedHistoryKey === item.json_key
                        ? "resume-history__row is-selected"
                        : "resume-history__row"
                    }
                    key={item.json_key}
                    onClick={() => {
                      setSelectedHistoryKey(item.json_key);
                      setSelectedFile(null);
                    }}
                    type="button"
                  >
                    <span className="resume-history__dot">
                      <FontAwesomeIcon
                        icon={
                          selectedHistoryKey === item.json_key
                            ? faCircleDot
                            : faCircle
                        }
                      />
                    </span>
                    <span className="resume-history__name">
                      <FontAwesomeIcon icon={faFileLines} />
                      {item.summary?.trim()
                        ? item.summary.split(".").slice(0, 1)[0]
                        : `Resume ${item.resume_id.slice(0, 8)}`}
                    </span>
                    <span>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
              {resumeHistory.length > 4 ? (
                <button
                  className="button button--ghost resume-history__more"
                  onClick={() => setIsHistoryModalOpen(true)}
                  type="button"
                >
                  Load more
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="auth-note">
            {masterResume && !selectedFile
              ? "Upload a new file above if you wish to overwrite your existing master resume."
              : statusMessage}
          </div>
        </SectionCard>
      </div>

      <section className="bottom-toolbar">
        <div className="bottom-toolbar__summary">
          <div className="bottom-toolbar__icon">AI</div>
          <div>
            <strong>
              Engine:{" "}
              {localStorage.getItem("ai_provider_display") || "Not Selected"} /{" "}
              {selectedMode === "sniper" ? "Sniper" : "General"}
            </strong>
            <p>Ready for high-precision tailoring</p>
          </div>
        </div>
        <div className="bottom-toolbar__actions">
          <button
            className="button button--ghost"
            onClick={() => {
              setSelectedFile(null);
              setSelectedHistoryKey(null);
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button--primary"
            disabled={isSaving}
            onClick={() => void handleProceed()}
            type="button"
          >
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : null}
            Proceed to Review &rarr;
          </button>
        </div>
      </section>

      {isHistoryModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsHistoryModalOpen(false)}
        >
          <section
            className="auth-modal resume-history-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="auth-modal__header">
              <h2 className="auth-modal__title">All Processed Resumes</h2>
              <button
                className="icon-button"
                onClick={() => setIsHistoryModalOpen(false)}
                type="button"
                aria-label="Close history"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="resume-history__list resume-history__list--modal">
              {resumeHistory.map((item) => (
                <button
                  className={
                    selectedHistoryKey === item.json_key
                      ? "resume-history__row is-selected"
                      : "resume-history__row"
                  }
                  key={item.json_key}
                  onClick={() => {
                    setSelectedHistoryKey(item.json_key);
                    setSelectedFile(null);
                    setIsHistoryModalOpen(false);
                  }}
                  type="button"
                >
                  <span className="resume-history__dot">
                    <FontAwesomeIcon
                      icon={
                        selectedHistoryKey === item.json_key
                          ? faCircleDot
                          : faCircle
                      }
                    />
                  </span>
                  <span className="resume-history__name">
                    <FontAwesomeIcon icon={faFileLines} />
                    {item.summary?.trim()
                      ? item.summary.split(".").slice(0, 1)[0]
                      : `Resume ${item.resume_id.slice(0, 8)}`}
                  </span>
                  <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default IngestionStep;
