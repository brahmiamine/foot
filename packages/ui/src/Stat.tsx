import type { ReactNode } from 'react'
import styled from 'styled-components'

export interface StatProps {
  label: ReactNode
  value: ReactNode
  /** e.g. "+4.2%" — purely decorative text, pair with `trend` for semantics. */
  delta?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
  className?: string
}

const trendColor = {
  up: 'var(--foot-color-success)',
  down: 'var(--foot-color-danger)',
  neutral: 'var(--foot-color-text-muted)',
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  max-width: 100%;
  padding: 1rem;
  border: 1px solid var(--foot-color-border);
  border-radius: var(--foot-radius-md);
  background: var(--foot-color-surface);
  font-family: var(--foot-font-ui);
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--foot-color-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
`

const IconWrap = styled.span`
  display: inline-flex;
  color: var(--foot-color-text-muted);

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }
`

const Value = styled.p`
  margin: 0;
  color: var(--foot-color-dark);
  font-family: var(--foot-font-display);
  font-size: 1.85rem;
  font-weight: 400;
  line-height: 1.1;

  :root.dark & {
    color: var(--foot-color-text);
  }
`

const Delta = styled.span<{ $trend: 'up' | 'down' | 'neutral' }>`
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${(p) => trendColor[p.$trend]};
`

export function Stat({ label, value, delta, trend = 'neutral', icon, className }: StatProps) {
  return (
    <Wrapper className={className}>
      <Head>
        <span>{label}</span>
        {icon && <IconWrap aria-hidden="true">{icon}</IconWrap>}
      </Head>
      <Value>{value}</Value>
      {delta && <Delta $trend={trend}>{delta}</Delta>}
    </Wrapper>
  )
}
