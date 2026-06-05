import { useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faDownload,
  faFileLines,
  faPenToSquare,
  faSpinner,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  deleteResume,
  deleteMasterResume,
  getMasterResume,
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
import { useNotification } from "../context/useNotification";
import { useWorkspace } from "../context/useWorkspace";
import { isInternalResumeSourceFileName } from "../lib/resumeFileName";
import type { ResumeHistoryItem } from "../types/api";

function getBaseFileName(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.split(/[\\/]/).pop()?.trim() ?? "";
}

function truncateFileName(value: string, maxLength = 42) {
  const cleaned = value.trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const lastDot = cleaned.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < cleaned.length - 1;
  const extension = hasExtension ? cleaned.slice(lastDot) : "";
  const stem = hasExtension ? cleaned.slice(0, lastDot) : cleaned;
  const available = Math.max(12, maxLength - extension.length - 3);
  return `${stem.slice(0, available)}...${extension}`;
}

function getResumeDisplayName(item: ResumeHistoryItem) {
  if (item.display_name?.trim()) {
    return item.display_name;
  }

  if (
    item.source_filename?.trim() &&
    !isInternalResumeSourceFileName(item.source_filename)
  ) {
    return item.source_filename;
  }

  return (
    item.summary?.trim() ||
    `Resume ${item.resume_id.slice(0, 8)}`
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { addNotification } = useNotification();
  const {
    masterResume,
    generatedResumeId,
    setMasterResume,
    setDraftResume,
    setGeneratedResume,
    setLastGenerateJob,
    setLastRenderJob,
  } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeHistory, setResumeHistory] = useState<ResumeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [resumePendingDelete, setResumePendingDelete] =
    useState<ResumeHistoryItem | null>(null);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Loading your profile and stored resume library...",
  );

  useEffect(() => {
    if (auth.status !== "authenticated") {
      setMasterResume(null);
      setDraftResume(null);
      setResumeHistory([]);
      setSelectedFile(null);
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);
      try {
        const [masterResponse, historyResponse] = await Promise.all([
          getMasterResume(),
          getResumeHistory(),
        ]);

        if (masterResponse.exists && masterResponse.document) {
          setMasterResume(masterResponse.document);
          setDraftResume(masterResponse.document);
        } else {
          setMasterResume(null);
          setDraftResume(null);
        }

        setResumeHistory(historyResponse.items);
      } catch {
        setMasterResume(null);
        setDraftResume(null);
        setResumeHistory([]);
        addNotification({
          type: "error",
          message: "Profile Load Failed",
          description: "We couldn't load your stored resume library right now.",
        });
      } finally {
        setIsLoading(false);
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
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    handleFilePick(event.dataTransfer.files);
  }

  async function handleSaveMasterResume() {
    if (!selectedFile) {
      addNotification({
        type: "warning",
        message: "No File Selected",
        description: "Choose a resume file before uploading a new master.",
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage("Validating AI credentials...");

    try {
      await validateAiKey();

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

      setStatusMessage("Parsing the uploaded master resume...");
      const parseJob = await uploadMasterResume({
        input_s3_key: upload.object_key,
        filename: selectedFile.name,
        content_type: selectedFile.type || null,
      });

      const job = await waitForJob(parseJob.job_id);
      if (job.status === "failed") {
        throw new Error(job.error || "The master resume parse job failed.");
      }

      const updatedMaster = await getMasterResume();
      if (!updatedMaster.exists || !updatedMaster.document) {
        throw new Error(
          "The worker completed, but no master resume JSON was returned.",
        );
      }

      setMasterResume(updatedMaster.document);
      setDraftResume(updatedMaster.document);
      setSelectedFile(null);
      const historyResponse = await getResumeHistory();
      setResumeHistory(historyResponse.items);
      addNotification({
        type: "success",
        message: "Master Resume Saved",
        description: "Your stored master resume has been updated.",
      });
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
      setIsUploading(false);
    }
  }

  async function handleDeleteMasterResume() {
    if (!masterResume) {
      return;
    }

    setIsUploading(true);
    setStatusMessage("Removing the stored master resume...");

    try {
      await deleteMasterResume();
      setMasterResume(null);
      setDraftResume(null);
      setSelectedFile(null);
      setIsDeleteConfirmOpen(false);
      addNotification({
        type: "success",
        message: "Master Resume Removed",
        description: "Your stored master resume has been deleted.",
      });
    } catch (error) {
      addNotification({
        type: "error",
        message: "Delete Failed",
        description: getApiErrorMessage(
          error,
          "Unable to delete the master resume.",
        ),
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteGeneratedResume(item: ResumeHistoryItem) {
    setDeletingResumeId(item.resume_id);

    try {
      await deleteResume(item.resume_id, item.json_key);
      setResumeHistory((current) =>
        current.filter((resume) => resume.resume_id !== item.resume_id),
      );
      if (generatedResumeId === item.resume_id) {
        setGeneratedResume(null, null);
      }
      setResumePendingDelete(null);
      addNotification({
        type: "success",
        message: "Generated Resume Deleted",
        description: `${getResumeDisplayName(item)} has been removed from your library.`,
      });
    } catch (error) {
      addNotification({
        type: "error",
        message: "Delete Failed",
        description: getApiErrorMessage(
          error,
          "Unable to delete the generated resume.",
        ),
      });
    } finally {
      setDeletingResumeId(null);
    }
  }

  function openResume(item: ResumeHistoryItem, step: "review" | "export") {
    setGeneratedResume(item.resume_id, item.json_key);
    setLastGenerateJob(null);
    setLastRenderJob(null);
    navigate(`/process?step=${step}&resumeKey=${encodeURIComponent(item.json_key)}`);
  }

  const masterFileName =
    masterResume?.metadata?.source &&
    getBaseFileName(masterResume.metadata.source)
      ? truncateFileName(getBaseFileName(masterResume.metadata.source))
      : masterResume
        ? "Stored master resume"
        : "No master resume uploaded yet";

  const selectedFileName = selectedFile?.name
    ? truncateFileName(selectedFile.name)
    : "";

  return (
    <div className="page-stack profile-page">
      {isUploading ? (
        <div
          className="generation-backdrop"
          role="status"
          aria-live="polite"
          aria-label="Saving master resume"
        >
          <div className="generation-backdrop__card">
            <FontAwesomeIcon icon={faSpinner} spin />
            <h2>Updating Master Resume</h2>
            <p>{statusMessage}</p>
          </div>
        </div>
      ) : null}

      <section className="page-intro page-intro--split">
        <div>
          <p className="eyebrow">Profile Library</p>
          <h1 className="page-title page-title--medium">Your Resume Vault</h1>
          <p className="page-copy">
            Keep one authoritative master resume on file and revisit every
            generated version from the same place.
          </p>
        </div>
      </section>

      {auth.status === "loading" ? (
        <SectionCard>
          <h2 className="section-card__title">Loading session</h2>
          <p className="section-copy">
            Checking your account before loading the profile library...
          </p>
        </SectionCard>
      ) : auth.status !== "authenticated" ? (
        <SectionCard>
          <h2 className="section-card__title">Sign in required</h2>
          <p className="section-copy">
            Sign in from the header to access your stored master resume and
            generated resume library.
          </p>
        </SectionCard>
      ) : isLoading ? (
        <SectionCard>
          <h2 className="section-card__title">Loading profile</h2>
          <p className="section-copy">
            Fetching your stored resumes and master file...
          </p>
        </SectionCard>
      ) : (
        <div className="dashboard-grid profile-grid">
          <SectionCard className="profile-master-card">
            <div className="section-card__header">
              <h2 className="section-card__title">Master Resume</h2>
              <p className="section-copy">
                Upload or replace the source file your account should use for
                future tailoring.
              </p>
            </div>

            <div className="profile-master-card__status">
              <div className="profile-master-card__status-icon">
                <FontAwesomeIcon icon={faFileLines} />
              </div>
              <div>
                <strong>{masterFileName}</strong>
                <p>
                  {masterResume
                    ? "Stored as the current master document."
                    : "No stored master document yet."}
                </p>
              </div>
              {masterResume ? (
                <button
                  aria-label="Delete master resume"
                  className="icon-button profile-master-card__delete"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  type="button"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              ) : null}
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
                <FontAwesomeIcon icon={faCloudArrowUp} />
              </div>
              <strong>Drop a new master resume here</strong>
              <span>
                We will parse the selected file and store it as your account's
                master resume.
              </span>
              <button
                className="button button--primary"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Choose File
              </button>
            </label>

            {selectedFile ? (
              <div className="profile-file-chip">
                <div className="profile-file-chip__meta">
                  <FontAwesomeIcon icon={faFileLines} />
                  <span title={selectedFile.name}>{selectedFileName}</span>
                </div>
                <button
                  className="queue-item__remove"
                  onClick={() => setSelectedFile(null)}
                  type="button"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            ) : null}

            {selectedFile ? (
              <div className="profile-master-card__actions">
                <button
                  className="button button--primary"
                  disabled={isUploading}
                  onClick={() => void handleSaveMasterResume()}
                  type="button"
                >
                  <FontAwesomeIcon icon={faCloudArrowUp} />
                  {masterResume
                    ? "Replace Master Resume"
                    : "Upload Master Resume"}
                </button>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard className="profile-history-card">
            <div className="section-card__header section-card__header--split">
              <div>
                <h2 className="section-card__title">Generated Resumes</h2>
                <p className="section-copy">
                  Open any saved version in review or jump straight to export.
                </p>
              </div>
              <span className="tag tag--dark">{resumeHistory.length}</span>
            </div>

            {resumeHistory.length > 0 ? (
              <div className="profile-resume-list">
                {resumeHistory.map((item) => {
                  const displayName = getResumeDisplayName(item);

                  return (
                    <article className="profile-resume-row" key={item.json_key}>
                      <div className="profile-resume-row__main">
                        <div className="profile-resume-row__icon">
                          <FontAwesomeIcon icon={faFileLines} />
                        </div>
                        <div className="profile-resume-row__copy">
                          <h3 title={displayName}>
                            {truncateFileName(displayName, 34)}
                          </h3>
                          <small>
                            Updated{" "}
                            {new Date(item.updated_at).toLocaleDateString()}
                          </small>
                        </div>
                      </div>

                      <div className="profile-resume-row__actions">
                        <button
                          className="button button--ghost profile-resume-row__button"
                          onClick={() => openResume(item, "review")}
                          type="button"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                          Review
                        </button>
                        <button
                          className="button button--primary profile-resume-row__button"
                          onClick={() => openResume(item, "export")}
                          type="button"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                          Export
                        </button>
                        <button
                          className="button button--danger profile-resume-row__button"
                          disabled={deletingResumeId === item.resume_id}
                          onClick={() => setResumePendingDelete(item)}
                          type="button"
                        >
                          <FontAwesomeIcon
                            icon={
                              deletingResumeId === item.resume_id
                                ? faSpinner
                                : faTrash
                            }
                            spin={deletingResumeId === item.resume_id}
                          />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="profile-empty-state">
                <FontAwesomeIcon icon={faFileLines} />
                <div>
                  <strong>No generated resumes yet</strong>
                  <p>
                    Once you create a tailored resume, it will appear here for
                    review and download.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {resumePendingDelete ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deletingResumeId) {
              setResumePendingDelete(null);
            }
          }}
          role="presentation"
        >
          <section
            className="auth-modal profile-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="auth-modal__header">
              <h2 className="auth-modal__title">Delete generated resume?</h2>
              <button
                className="icon-button"
                disabled={Boolean(deletingResumeId)}
                onClick={() => setResumePendingDelete(null)}
                type="button"
                aria-label="Close confirmation"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <p className="section-copy">
              This will permanently remove{" "}
              <strong>{getResumeDisplayName(resumePendingDelete)}</strong> from
              your generated resume library. Your master resume will not be
              changed.
            </p>
            <div className="profile-confirm-modal__actions">
              <button
                className="button button--ghost"
                disabled={Boolean(deletingResumeId)}
                onClick={() => setResumePendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                disabled={Boolean(deletingResumeId)}
                onClick={() => void handleDeleteGeneratedResume(resumePendingDelete)}
                type="button"
              >
                {deletingResumeId ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faTrash} />
                )}
                {deletingResumeId ? "Deleting..." : "Delete Resume"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isDeleteConfirmOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsDeleteConfirmOpen(false)}
          role="presentation"
        >
          <section
            className="auth-modal profile-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="auth-modal__header">
              <h2 className="auth-modal__title">Delete master resume?</h2>
              <button
                className="icon-button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                type="button"
                aria-label="Close confirmation"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <p className="section-copy">
              This will permanently remove the stored master resume from your
              account. You can upload a new one afterward, but this file will
              be gone.
            </p>
            <div className="profile-confirm-modal__actions">
              <button
                className="button button--ghost"
                onClick={() => setIsDeleteConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  void handleDeleteMasterResume();
                }}
                type="button"
              >
                Delete Resume
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default ProfilePage;
