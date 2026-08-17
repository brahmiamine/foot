import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import styled, { css } from 'styled-components'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  interactive?: boolean
}

const paddingStyles: Record<CardPadding, ReturnType<typeof css>> = {
  none: css`
    padding: 0;
  `,
  sm: css`
    padding: 0.75rem;
  `,
  md: css`
    padding: 1rem;
  `,
  lg: css`
    padding: 1.5rem;

    @media (max-width: 640px) {
      padding: 1rem;
    }
  `,
}

const StyledCard = styled.div<{ $padding: CardPadding; $interactive: boolean }>`
  min-width: 0;
  max-width: 100%;
  background: var(--foot-color-surface);
  border: 1px solid var(--foot-color-border);
  border-radius: var(--foot-radius-md);
  color: var(--foot-color-text);
  overflow-wrap: anywhere;

  > * {
    min-width: 0;
    max-width: 100%;
  }

  ${(p) => paddingStyles[p.$padding]}

  ${(p) =>
    p.$interactive &&
    css`
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;
      cursor: pointer;

      &:hover {
        border-color: color-mix(in srgb, var(--foot-color-primary) 24%, var(--foot-color-border));
        box-shadow: 0 4px 8px rgba(11, 31, 46, 0.08);
        transform: translateY(-1px);
      }

      &:focus-visible {
        outline: 2px solid var(--foot-color-primary);
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        transition-duration: 0.001ms;

        &:hover {
          transform: none;
        }
      }
    `}
`

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', interactive = false, children, ...rest },
  ref,
) {
  return (
    <StyledCard
      ref={ref}
      $padding={padding}
      $interactive={interactive}
      tabIndex={interactive ? (rest.tabIndex ?? 0) : rest.tabIndex}
      {...rest}
    >
      {children}
    </StyledCard>
  )
})
