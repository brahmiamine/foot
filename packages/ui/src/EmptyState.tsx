import type { ReactNode } from 'react'
import styled from 'styled-components'

export interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 0;
  max-width: 100%;
  padding: 2.5rem 1.5rem;
  text-align: center;
  color: var(--foot-color-text);
  font-family: var(--foot-font-ui);
`

const IconWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.25rem;
  color: var(--foot-color-text-muted);

  svg {
    width: 100%;
    height: 100%;
  }
`

const Title = styled.p`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
`

const Description = styled.p`
  max-width: 42ch;
  margin: 0;
  font-size: 0.875rem;
  color: var(--foot-color-text-muted);
  line-height: 1.5;
`

const ActionWrap = styled.div`
  margin-top: 0.5rem;
`

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Wrapper className={className}>
      {icon && <IconWrap aria-hidden="true">{icon}</IconWrap>}
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {action && <ActionWrap>{action}</ActionWrap>}
    </Wrapper>
  )
}
