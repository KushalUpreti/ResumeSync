import { useEffect, useRef, useState } from "react";
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

const REVIEW_EXPORT_TRANSITION_MS = 560;

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
  const {
    generatedResumeId,
    setMasterResume,
    setDraftResume,
    setGeneratedResume,
    setGeneratedFileBaseName,
    setLastGenerateJob,
    setLastRenderJob,
  } = useWorkspace();
  const [currentStep, setCurrentStep] = useState(() =>
    resolveStepFromQuery(requestedStep, Boolean(resumeId || resumeKey)),
  );
  const [transitionTarget, setTransitionTarget] = useState<number | null>(null);
  const [isHydratingResume, setIsHydratingResume] = useState(Boolean(resumeId || resumeKey));
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentStep(resolveStepFromQuery(requestedStep, Boolean(resumeId || resumeKey)));
    setTransitionTarget(null);
  }, [requestedStep, resumeId, resumeKey]);

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
        setGeneratedFileBaseName("Tailored Resume");
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

  const isTransitioning = transitionTarget !== null;
  const displayStep = transitionTarget ?? currentStep;
  const isReviewExportTransition =
    isTransitioning &&
    ((currentStep === 3 && transitionTarget === 4) ||
      (currentStep === 4 && transitionTarget === 3));
  const transitionDirection =
    currentStep === 3 && transitionTarget === 4
      ? "forward"
      : currentStep === 4 && transitionTarget === 3
        ? "backward"
        : null;

  const finishTransition = (nextStep: number) => {
    setCurrentStep(nextStep);
    setTransitionTarget(null);
    transitionTimerRef.current = null;
  };

  const beginTransition = (nextStep: number) => {
    if (transitionTimerRef.current !== null || nextStep === currentStep) {
      return;
    }

    const isReviewToExport = currentStep === 3 && nextStep === 4;
    const isExportToReview = currentStep === 4 && nextStep === 3;

    if (!isReviewToExport && !isExportToReview) {
      setCurrentStep(nextStep);
      return;
    }

    setTransitionTarget(nextStep);
    transitionTimerRef.current = window.setTimeout(() => {
      finishTransition(nextStep);
    }, REVIEW_EXPORT_TRANSITION_MS);
  };

  const handleNext = () =>
    beginTransition(Math.min(currentStep + 1, flowSteps.length));
  const handleBack = () => beginTransition(Math.max(currentStep - 1, 1));

  const handleStepClick = (step: number) => {
    if (isTransitioning) {
      return;
    }

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
            activeStep={displayStep}
            steps={flowSteps}
            onStepClick={handleStepClick}
            getWarningMessage={(step) =>
              generatedResumeId && displayStep >= 3 && step < 3
                ? "You will lose your review edits if you go back."
                : null
            }
          />
          <div id="header-actions-portal" />
        </div>
      </div>

      <div
        className={
          isReviewExportTransition
            ? `process-content process-content--transition is-${transitionDirection}`
            : "process-content"
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
        ) : isReviewExportTransition && transitionTarget !== null ? (
          <div className={`process-transition-stack is-${transitionDirection}`}>
            <div className="process-transition-stack__layer process-transition-stack__layer--exit">
              {renderStep(currentStep)}
            </div>
            <div className="process-transition-stack__layer process-transition-stack__layer--enter">
              {renderStep(transitionTarget)}
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
