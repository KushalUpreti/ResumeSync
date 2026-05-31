import React, { type FC } from "react";
import TemplateCard from "../components/TemplateCard";
import { useWorkspace } from "../context/useWorkspace";
import { templates } from "../data/mockData";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowDown, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { renderResume, waitForJob } from "../api/resumeSync";

type ExportStepProps = {
  // Back navigation removed per request
  // onBack?: () => void
};

const ExportStep: FC<ExportStepProps> = (/*{ onBack }*/) => {
  const {
    selectedTemplateId,
    setSelectedTemplateId,
    generatedResumeId,
    lastRenderJob,
    setLastRenderJob,
  } = useWorkspace();
  const [renderStatus, setRenderStatus] = useState("");
  const [isRendering, setIsRendering] = useState(false);

  async function handleRender() {
    if (!generatedResumeId) {
      setRenderStatus(
        "Generate a draft first so the backend has a resume id to render.",
      );
      return;
    }
    setIsRendering(true);
    setRenderStatus("Submitting a render job to the backend...");
    try {
      const renderJob = await renderResume(generatedResumeId, {
        template_id: selectedTemplateId,
      });
      const finalJob = await waitForJob(renderJob.job_id);
      setLastRenderJob(finalJob);
      if (finalJob.status === "failed") {
        throw new Error(finalJob.error || "Render failed.");
      }
      setRenderStatus(
        `Render complete. Output stored at ${finalJob.output_s3_key}.`,
      );
    } catch (error) {
      setRenderStatus(
        error instanceof Error ? error.message : "Unable to render the resume.",
      );
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-intro page-intro--split">
        <div>
          <p className="eyebrow">Step 4 / Final Export</p>
          <h1 className="page-title page-title--medium">
            Choose Your Template
          </h1>
          <p className="page-copy">
            Select a layout optimized by our AI for your specific industry and
            experience level. You can switch templates at any time.
          </p>
        </div>
      </section>

      <div className="template-grid">
        {templates.map((template) => (
          <TemplateCard
            accent={template.accent}
            description={template.description}
            isSelected={selectedTemplateId === template.title.toLowerCase()}
            imgSrc={template.imgSrc}
            key={template.title}
            onSelect={() => setSelectedTemplateId(template.title.toLowerCase())}
            title={template.title}
          />
        ))}
      </div>

      <div
        className="page-intro__actions"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "var(--space-4)",
        }}
      >
        <button
          className="button button--ghost"
          onClick={() => void handleRender()}
          type="button"
        >
          {isRendering ? <FontAwesomeIcon icon={faSpinner} spin /> : null}
          <FontAwesomeIcon icon={faFileArrowDown} />
          Export .docx
        </button>
      </div>
    </div>
  );
};

export default ExportStep;
