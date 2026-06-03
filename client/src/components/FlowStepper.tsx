import type { CSSProperties } from 'react'

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
        const isReached = isComplete || isActive
        const isConnectorReached = index < activeIndex
        const canNavigate = isComplete || isActive
        const warningMessage = getWarningMessage?.(step.step) ?? null
        const connectorStyle = {
          '--step-index': index,
          '--connector-delay': `${index * 980}ms`,
          '--connector-duration': `1.05s`,
          '--connector-from': `${-42 - index * 5}px`,
          '--connector-mid': `${96 + index * 6}px`,
          '--connector-to': `${108 + index * 7}px`,
          '--connector-scale-from': `${0.7 - index * 0.03}`,
          '--connector-scale-mid': `${1.08 + index * 0.03}`,
          '--connector-scale-to': `${1.14 + index * 0.04}`,
        } as CSSProperties

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
                data-reached={isReached ? 'true' : 'false'}
                style={{ '--step-index': index } as CSSProperties}
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
                data-reached="false"
                style={{ '--step-index': index } as CSSProperties}
              >
                <span className="flow-stepper__count">{step.step}</span>
                <span>{step.label}</span>
              </span>
            )}
            {index < steps.length - 1 ? (
              <span
                key={`connector-${step.step}-${activeStep}`}
                className={
                  isConnectorReached
                    ? 'flow-stepper__rule is-reached'
                    : 'flow-stepper__rule'
                }
                data-reached={isConnectorReached ? 'true' : 'false'}
                style={connectorStyle}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default FlowStepper
