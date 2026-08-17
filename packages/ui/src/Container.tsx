import type { HTMLAttributes } from 'react'
import styled from 'styled-components'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Mirrors the shared `.foot-page-container` utility from
 * `@foot/design-tokens` so styled-components consumers get the same
 * centered, gutter-safe max-width wrapper without needing the CSS class.
 */
export const Container = styled.div<ContainerProps>`
  width: min(100%, var(--foot-content-max));
  min-width: 0;
  margin-inline: auto;
  padding-inline: var(--foot-page-gutter);
`
