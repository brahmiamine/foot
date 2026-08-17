import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'

export interface StepItem {
  label: ReactNode
  description?: ReactNode
}

export interface StepperProps {
  steps: StepItem[]
  activeStep: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

const List = styled.ol<{ $orientation: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${(p) => (p.$orientation === 'vertical' ? 'column' : 'row')};
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--foot-font-ui);
`

const Step = styled.li<{ $orientation: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${(p) => (p.$orientation === 'vertical' ? 'row' : 'column')};
  align-items: ${(p) => (p.$orientation === 'vertical' ? 'flex-start' : 'center')};
  gap: 0.5rem;
  flex: ${(p) => (p.$orientation === 'horizontal' ? '1' : 'initial')};
  min-width: 0;
  position: relative;

  ${(p) =>
    p.$orientation === 'horizontal'
      ? css`
          &:not(:last-child)::after {
            content: '';
            position: absolute;
            inset-inline-start: calc(50% + 1.1rem);
            inset-inline-end: calc(-50% + 1.1rem);
            inset-block-start: 0.9rem;
            height: 2px;
            background: var(--foot-color-border);
          }
        `
      : css`
          padding-bottom: 1.25rem;

          &:not(:last-child)::after {
            content: '';
            position: absolute;
            inset-inline-start: 0.9rem;
            inset-block-start: 2rem;
            inset-block-end: 0;
            width: 2px;
            background: var(--foot-color-border);
          }
        `}
`

const Circle = styled.span<{ $state: 'complete' | 'active' | 'upcoming' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.8125rem;
  border: 2px solid
    ${(p) => (p.$state === 'upcoming' ? 'var(--foot-color-border)' : 'var(--foot-color-primary)')};
  background: ${(p) => (p.$state === 'complete' ? 'var(--foot-color-primary)' : 'transparent')};
  color: ${(p) =>
    p.$state === 'complete' ? '#fff' : p.$state === 'active' ? 'var(--foot-color-primary)' : 'var(--foot-color-text-muted)'};
  z-index: 1;
`

const Copy = styled.div<{ $orientation: 'horizontal' | 'vertical' }>`
  text-align: ${(p) => (p.$orientation === 'horizontal' ? 'center' : 'start')};
  min-width: 0;
`

const StepLabel = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--foot-color-text);
`

const StepDescription = styled.p`
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--foot-color-text-muted);
`

export function Stepper({ steps, activeStep, orientation = 'horizontal', className }: StepperProps) {
  return (
    <List as="ol" aria-label="Étapes" $orientation={orientation} className={className}>
      {steps.map((step, index) => {
        const state = index < activeStep ? 'complete' : index === activeStep ? 'active' : 'upcoming'
        return (
          <Step key={index} $orientation={orientation} aria-current={state === 'active' ? 'step' : undefined}>
            <Circle $state={state} aria-hidden="true">
              {state === 'complete' ? '✓' : index + 1}
            </Circle>
            <Copy $orientation={orientation}>
              <StepLabel>{step.label}</StepLabel>
              {step.description && <StepDescription>{step.description}</StepDescription>}
            </Copy>
          </Step>
        )
      })}
    </List>
  )
}
