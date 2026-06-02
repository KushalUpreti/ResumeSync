import { useState } from "react";
import { flowSteps } from "../data/mockData";
import FlowStepper from "../components/FlowStepper";
import IngestionStep from "./IngestionStep";
import ConfigStep from "./ConfigStep";
import ReviewStep from "./ReviewStep";
import ExportStep from "./ExportStep";
import { useWorkspace } from "../context/useWorkspace";

function ProcessPage() {
  const { generatedResumeId } = useWorkspace();
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, flowSteps.length));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  const handleStepClick = (step: number) => {
    // Only allow clicking back to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
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
                ? "You’ve already generated a resume. Going back may lose your review edits and generated progress."
                : null
            }
          />
          <div id="header-actions-portal" />
        </div>
      </div>

      <div className="process-content">
        {currentStep === 1 && (
          <ConfigStep onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 2 && <IngestionStep onNext={handleNext} />}
        {currentStep === 3 && (
          <ReviewStep onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 4 && <ExportStep onBack={handleBack} />}
      </div>
    </div>
  );
}

export default ProcessPage;
