export type FlowStep = {
  label: string
  step: number
  to?: string
}

type FlowStepperProps = {
  activeStep: number
  steps: FlowStep[]
  onStepClick?: (step: number) => void
}

function FlowStepper({ activeStep, steps, onStepClick }: FlowStepperProps) {
  const activeIndex = steps.findIndex((step) => step.step === activeStep)

  return (
    <div className="flow-stepper" aria-label="Workflow">
      {steps.map((step, index) => {
        const isComplete = index < activeIndex
        const isActive = step.step === activeStep
        const canNavigate = isComplete || isActive

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
              >
                <span className="flow-stepper__count">{step.step}</span>
                <span>{step.label}</span>
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
