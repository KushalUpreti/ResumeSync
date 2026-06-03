import { type FC } from "react";
import TemplateCard from "../components/TemplateCard";
import { useWorkspace } from "../context/useWorkspace";
import { templates } from "../data/mockData";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowDown, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { downloadTemplate } from "../api/resumeSync";
import { useNotification } from "../context/useNotification";

type ExportStepProps = {
  // Back navigation removed per request
};

const ExportStep: FC<ExportStepProps> = () => {
  const {
    selectedTemplateId,
    setSelectedTemplateId,
    generatedResumeId,
    generatedFileBaseName,
  } = useWorkspace();
  const { addNotification } = useNotification();
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleExport() {
    if (!generatedResumeId) {
      addNotification({
        type: "error",
        message: "Export Failed",
        description: "No resume available to export.",
      });
      return;
    }

    const templateName = selectedTemplateId || "modern";
    setIsDownloading(true);
    try {
      await downloadTemplate(generatedResumeId, templateName, generatedFileBaseName);
    } catch (error) {
      addNotification({
        type: "error",
        message: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to download template.",
      });
    } finally {
      setIsDownloading(false);
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
          disabled={isDownloading}
          onClick={() => void handleExport()}
          type="button"
        >
          {isDownloading ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faFileArrowDown} />
          )}
          {isDownloading ? "Downloading..." : "Export .docx"}
        </button>
      </div>
    </div>
  );
};

export default ExportStep;
