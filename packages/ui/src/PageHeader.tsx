import type { HTMLAttributes, ReactNode } from 'react'
import styled from 'styled-components'

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

const StyledHeader = styled.div`
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }
`

const Copy = styled.div`
  min-width: 0;
`

const Title = styled.h1`
  margin: 0;
  color: var(--foot-color-dark);
  font-family: var(--foot-font-display);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1;
  overflow-wrap: anywhere;
  text-wrap: balance;

  :root.dark & {
    color: var(--foot-color-text);
  }

  @media (max-width: 420px) {
    font-size: clamp(1.6rem, 9vw, 2rem);
  }
`

const Description = styled.p`
  max-width: 70ch;
  margin: 0.55rem 0 0;
  color: var(--foot-color-text-muted);
  font-family: var(--foot-font-ui);
  font-size: 0.925rem;
  line-height: 1.55;
  text-wrap: pretty;
`

const Actions = styled.div`
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: flex-start;
  }

  @media (max-width: 420px) {
    > * {
      width: 100%;
    }
  }
`

export function PageHeader({ title, description, actions, ...rest }: PageHeaderProps) {
  return (
    <StyledHeader {...rest}>
      <Copy>
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
      </Copy>
      {actions && <Actions>{actions}</Actions>}
    </StyledHeader>
  )
}
