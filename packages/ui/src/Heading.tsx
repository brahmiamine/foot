import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import styled, { css } from 'styled-components'

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  /** Visual size, independent from the semantic `as` level. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Uses the display (Bebas Neue) font instead of the UI font. */
  display?: boolean
}

const sizeStyles = {
  xs: css`
    font-size: 1rem;
  `,
  sm: css`
    font-size: 1.25rem;
  `,
  md: css`
    font-size: 1.5rem;
  `,
  lg: css`
    font-size: clamp(1.75rem, 3vw, 2.25rem);
  `,
  xl: css`
    font-size: clamp(2rem, 4vw, 3rem);
  `,
}

const StyledHeading = styled.h2<{ $size: NonNullable<HeadingProps['size']>; $display: boolean }>`
  margin: 0;
  color: var(--foot-color-dark);
  font-family: ${(p) => (p.$display ? 'var(--foot-font-display)' : 'var(--foot-font-ui)')};
  font-weight: ${(p) => (p.$display ? 400 : 800)};
  letter-spacing: ${(p) => (p.$display ? '-0.02em' : 'normal')};
  line-height: 1.2;
  overflow-wrap: anywhere;
  text-wrap: balance;

  ${(p) => sizeStyles[p.$size]}

  :root.dark & {
    color: var(--foot-color-text);
  }
`

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { as = 'h2', size = 'md', display = false, ...rest },
  ref,
) {
  return <StyledHeading ref={ref} as={as} $size={size} $display={display} {...rest} />
})
