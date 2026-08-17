import type { CSSProperties } from 'react'
import styled from 'styled-components'

export interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  showValueLabel?: boolean
  className?: string
  style?: CSSProperties
}

const variantColor = {
  primary: 'var(--foot-color-primary)',
  success: 'var(--foot-color-success)',
  warning: 'var(--foot-color-warning)',
  danger: 'var(--foot-color-danger)',
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  max-width: 100%;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-family: var(--foot-font-ui);
  font-size: 0.75rem;
  color: var(--foot-color-text-muted);
`

const Track = styled.div`
  width: 100%;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--foot-color-border);
  overflow: hidden;
`

const Fill = styled.div<{ $percent: number; $variant: keyof typeof variantColor }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  background: ${(p) => variantColor[p.$variant]};
  border-radius: inherit;
  transition: width 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;
  }
`

export function ProgressBar({
  value,
  max = 100,
  label,
  variant = 'primary',
  showValueLabel = false,
  className,
  style,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <Wrapper className={className} style={style}>
      {(label || showValueLabel) && (
        <Head>
          {label && <span>{label}</span>}
          {showValueLabel && <span>{Math.round(percent)}%</span>}
        </Head>
      )}
      <Track role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <Fill $percent={percent} $variant={variant} />
      </Track>
    </Wrapper>
  )
}
