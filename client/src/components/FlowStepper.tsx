import { Link } from 'react-router-dom'

export type FlowStep = {
  label: string
  step: number
  to: string
}

type FlowStepperProps = {
  currentPath: string
  steps: FlowStep[]
}

function FlowStepper({ currentPath, steps }: FlowStepperProps) {
  const activeIndex = steps.findIndex((step) => step.to === currentPath)

  return (
    <div className="flow-stepper" aria-label="Workflow">
      {steps.map((step, index) => {
        const isComplete = activeIndex > index
        const isActive = currentPath === step.to
        const canNavigate = isComplete || isActive

        return (
          <div className="flow-stepper__item" key={step.to}>
            {canNavigate ? (
              <Link
                className={
                  isActive
                    ? 'flow-stepper__link is-active'
                    : isComplete
                      ? 'flow-stepper__link is-complete'
                      : 'flow-stepper__link'
                }
                to={step.to}
              >
                <span className="flow-stepper__count">{step.step}</span>
                <span>{step.label}</span>
              </Link>
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
