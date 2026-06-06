import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { flowSteps } from "../data/mockData";
import FlowStepper from "../components/FlowStepper";
import IngestionStep from "./IngestionStep";
import ConfigStep from "./ConfigStep";
import ReviewStep from "./ReviewStep";
import ExportStep from "./ExportStep";
import { getResume, getResumeByKey } from "../api/resumeSync";
import { useNotification } from "../context/useNotification";
import { useWorkspace } from "../context/useWorkspace";
import { deriveResumeFileBaseName } from "../lib/resumeFileName";

function resolveStepFromQuery(stepParam: string | null, hasResumeId: boolean) {
  if (stepParam === "config") {
    return 1;
  }

  if (stepParam === "ingestion") {
    return 2;
  }

  if (stepParam === "review") {
    return 3;
  }

  if (stepParam === "export") {
    return 4;
  }

  return hasResumeId ? 3 : 1;
}

function ProcessPage() {
  const { addNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("resumeId");
  const resumeKey = searchParams.get("resumeKey");
  const requestedStep = searchParams.get("step");
  const requestedMode = searchParams.get("mode");
  const {
    generatedResumeId,
    setMasterResume,
    setDraftResume,
    setGeneratedResume,
    setGeneratedFileBaseName,
    setLastGenerateJob,
    setLastRenderJob,
    setTailoringMode,
  } = useWorkspace();
  const [currentStep, setCurrentStep] = useState(() =>
    resolveStepFromQuery(requestedStep, Boolean(resumeId || resumeKey)),
  );
  const [isHydratingResume, setIsHydratingResume] = useState(Boolean(resumeId || resumeKey));

  useEffect(() => {
    setCurrentStep(resolveStepFromQuery(requestedStep, Boolean(resumeId || resumeKey)));
  }, [requestedStep, resumeId, resumeKey]);

  useEffect(() => {
    if (requestedMode === "polisher" || requestedMode === "sniper") {
      setTailoringMode(requestedMode);
    }
  }, [requestedMode, setTailoringMode]);

  useEffect(() => {
    if (!resumeId && !resumeKey) {
      setIsHydratingResume(false);
      return;
    }

    let cancelled = false;
    setIsHydratingResume(true);
    setMasterResume(null);
    setDraftResume(null);
    setGeneratedResume(null, null);
    setGeneratedFileBaseName("Tailored Resume");
    setLastGenerateJob(null);
    setLastRenderJob(null);

    void (async () => {
      try {
        const document = resumeKey
          ? await getResumeByKey(resumeKey)
          : await getResume(resumeId as string);
        if (cancelled) {
          return;
        }

        setMasterResume(null);
        setDraftResume(document);
        setGeneratedResume(document.resume_id, resumeKey ?? null);
        setGeneratedFileBaseName(deriveResumeFileBaseName(document));
        setLastGenerateJob(null);
        setLastRenderJob(null);
      } catch {
        if (cancelled) {
          return;
        }

        setMasterResume(null);
        setDraftResume(null);
        setGeneratedResume(null, null);
        setLastGenerateJob(null);
        setLastRenderJob(null);
        setCurrentStep(1);
        addNotification({
          type: "error",
          message: "Resume Load Failed",
          description: "We couldn't load the selected resume right now.",
        });
      } finally {
        if (!cancelled) {
          setIsHydratingResume(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    addNotification,
    resumeId,
    resumeKey,
    setDraftResume,
    setGeneratedFileBaseName,
    setGeneratedResume,
    setLastGenerateJob,
    setLastRenderJob,
    setMasterResume,
  ]);

  const handleNext = () =>
    setCurrentStep((current) => Math.min(current + 1, flowSteps.length));
  const handleBack = () => setCurrentStep((current) => Math.max(current - 1, 1));

  const handleStepClick = (step: number) => {
    // Only allow clicking back to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const renderStep = (step: number) => {
    if (step === 1) {
      return <ConfigStep onNext={handleNext} onBack={handleBack} />;
    }

    if (step === 2) {
      return <IngestionStep onNext={handleNext} />;
    }

    if (step === 3) {
      return <ReviewStep onNext={handleNext} onBack={handleBack} />;
    }

    return <ExportStep />;
  };

  return (
    <div className="process-container">
      <div className="process-header">
        <div className="container header-flex">
          <FlowStepper
            activeStep={currentStep}
            steps={flowSteps}
            onStepClick={handleStepClick}
            getWarningMessage={(step) =>
              generatedResumeId && currentStep >= 3 && step < 3
                ? "You will lose your review edits if you go back."
                : null
            }
          />
          <div id="header-actions-portal" />
        </div>
      </div>

      <div
        className={
          "process-content"
        }
      >
        {isHydratingResume ? (
          <div
            className="generation-backdrop"
            role="status"
            aria-live="polite"
            aria-label="Loading saved resume"
          >
            <div className="generation-backdrop__card">
              <h2>Loading saved resume</h2>
              <p>Please wait while we open the selected resume for review.</p>
            </div>
          </div>
        ) : (
          renderStep(currentStep)
        )}
      </div>
    </div>
  );
}

export default ProcessPage;
