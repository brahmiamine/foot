import { forwardRef } from 'react'
import type { AnchorHTMLAttributes } from 'react'
import styled, { css } from 'styled-components'
import { focusRing } from './internal/mixins'

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'primary' | 'muted' | 'inherit'
  underline?: 'always' | 'hover' | 'none'
}

const variantStyles = {
  primary: css`
    color: var(--foot-color-primary);
  `,
  muted: css`
    color: var(--foot-color-text-muted);
  `,
  inherit: css`
    color: inherit;
  `,
}

const underlineStyles = {
  always: css`
    text-decoration: underline;
  `,
  hover: css`
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  `,
  none: css`
    text-decoration: none;
  `,
}

const StyledLink = styled.a<{ $variant: 'primary' | 'muted' | 'inherit'; $underline: 'always' | 'hover' | 'none' }>`
  font-family: var(--foot-font-ui);
  border-radius: var(--foot-radius-sm);
  text-underline-offset: 0.15em;
  cursor: pointer;

  ${(p) => variantStyles[p.$variant]}
  ${(p) => underlineStyles[p.$underline]}
  ${focusRing}
`

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { variant = 'primary', underline = 'hover', target, rel, ...rest },
  ref,
) {
  const safeRel = target === '_blank' ? (rel ?? 'noopener noreferrer') : rel
  return (
    <StyledLink ref={ref} $variant={variant} $underline={underline} target={target} rel={safeRel} {...rest} />
  )
})
