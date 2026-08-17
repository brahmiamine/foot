import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import styled, { css } from 'styled-components'

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  as?: 'p' | 'span' | 'div' | 'label'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  weight?: 'regular' | 'medium' | 'bold'
  tone?: 'default' | 'muted' | 'danger' | 'success'
  truncate?: boolean
}

const sizeStyles = {
  xs: css`
    font-size: 0.75rem;
  `,
  sm: css`
    font-size: 0.8125rem;
  `,
  md: css`
    font-size: 0.875rem;
  `,
  lg: css`
    font-size: 1rem;
  `,
}

const weightStyles = {
  regular: css`
    font-weight: 400;
  `,
  medium: css`
    font-weight: 600;
  `,
  bold: css`
    font-weight: 800;
  `,
}

const toneStyles = {
  default: css`
    color: var(--foot-color-text);
  `,
  muted: css`
    color: var(--foot-color-text-muted);
  `,
  danger: css`
    color: var(--foot-color-danger);
  `,
  success: css`
    color: var(--foot-color-success);
  `,
}

const StyledText = styled.p<{
  $size: NonNullable<TextProps['size']>
  $weight: NonNullable<TextProps['weight']>
  $tone: NonNullable<TextProps['tone']>
  $truncate: boolean
}>`
  margin: 0;
  min-width: 0;
  max-width: 100%;
  font-family: var(--foot-font-ui);
  line-height: 1.5;
  overflow-wrap: anywhere;

  ${(p) => sizeStyles[p.$size]}
  ${(p) => weightStyles[p.$weight]}
  ${(p) => toneStyles[p.$tone]}

  ${(p) =>
    p.$truncate &&
    css`
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `}
`

export const Text = forwardRef<HTMLParagraphElement, TextProps>(function Text(
  { as = 'p', size = 'md', weight = 'regular', tone = 'default', truncate = false, ...rest },
  ref,
) {
  return (
    <StyledText
      ref={ref}
      as={as}
      $size={size}
      $weight={weight}
      $tone={tone}
      $truncate={truncate}
      {...rest}
    />
  )
})
