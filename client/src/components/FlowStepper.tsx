export type FlowStep = {
  label: string
  step: number
  to?: string
}

type FlowStepperProps = {
  activeStep: number
  steps: FlowStep[]
  onStepClick?: (step: number) => void
  getWarningMessage?: (step: number) => string | null
}

function FlowStepper({
  activeStep,
  steps,
  onStepClick,
  getWarningMessage,
}: FlowStepperProps) {
  const activeIndex = steps.findIndex((step) => step.step === activeStep)

  return (
    <div className="flow-stepper" aria-label="Workflow">
      {steps.map((step, index) => {
        const isComplete = index < activeIndex
        const isActive = step.step === activeStep
        const canNavigate = isComplete || isActive
        const warningMessage = getWarningMessage?.(step.step) ?? null

        return (
          <div className="flow-stepper__item" key={step.step}>
            {canNavigate ? (
              <button
                className={
                  isActive
                    ? 'flow-stepper__link is-active'
                    : isComplete
                      ? 'flow-stepper__link is-complete'
                      : 'flow-stepper__link'
                }
                onClick={() => onStepClick?.(step.step)}
                type="button"
                disabled={!onStepClick && !isComplete}
                aria-describedby={
                  warningMessage ? `flow-stepper-warning-${step.step}` : undefined
                }
              >
                <span className="flow-stepper__count">{step.step}</span>
                <span>{step.label}</span>
                {warningMessage ? (
                  <span
                    className="flow-stepper__warning"
                    id={`flow-stepper-warning-${step.step}`}
                    role="tooltip"
                  >
                    {warningMessage}
                  </span>
                ) : null}
              </button>
            ) : (
              <span
                aria-disabled="true"
                className="flow-stepper__link is-disabled"
              >
                <span className="flow-stepper__count">{step.step}</span>
                <span>{step.label}</span>
              </span>
            )}
            {index < steps.length - 1 ? <span className="flow-stepper__rule" /> : null}
          </div>
        )
      })}
    </div>
  )
}

export default FlowStepper
