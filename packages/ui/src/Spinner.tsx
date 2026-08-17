import styled, { keyframes } from 'styled-components'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label announced to assistive tech (visually hidden). */
  label?: string
  className?: string
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

const dimensions = {
  sm: '1rem',
  md: '1.5rem',
  lg: '2.5rem',
}

const StyledSpinner = styled.span<{ $size: 'sm' | 'md' | 'lg' }>`
  display: inline-block;
  width: ${(p) => dimensions[p.$size]};
  height: ${(p) => dimensions[p.$size]};
  border: 0.18em solid var(--foot-color-border);
  border-inline-start-color: var(--foot-color-primary);
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.4s;
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export function Spinner({ size = 'md', label = 'Chargement…', className }: SpinnerProps) {
  return (
    <span role="status" className={className}>
      <StyledSpinner $size={size} aria-hidden="true" />
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  )
}
