import { useState } from 'react'
import { flowSteps } from '../data/mockData'
import FlowStepper from '../components/FlowStepper'
import IngestionStep from './IngestionStep'
import ConfigStep from './ConfigStep'
import ReviewStep from './ReviewStep'
import ExportStep from './ExportStep'

function ProcessPage() {
  const [currentStep, setCurrentStep] = useState(1)

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, flowSteps.length))
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1))
  const handleStepClick = (step: number) => {
    // Only allow clicking back to completed steps
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }

  return (
    <div className="process-container">
      <div className="process-header">
        <div className="container">
          <FlowStepper 
            activeStep={currentStep} 
            steps={flowSteps} 
            onStepClick={handleStepClick}
          />
        </div>
      </div>

      <div className="process-content">
        {currentStep === 1 && <IngestionStep onNext={handleNext} />}
        {currentStep === 2 && (
          <ConfigStep onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 3 && (
          <ReviewStep onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 4 && <ExportStep onBack={handleBack} />}
      </div>
    </div>
  )
}

export default ProcessPage
