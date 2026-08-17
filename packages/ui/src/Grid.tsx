import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import styled from 'styled-components'
import type { SpaceToken } from './Stack'
import { footTheme } from './theme'

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns, or `"fluid"` to reuse the shared `.foot-fluid-grid` auto-fit behavior. */
  columns?: number | 'fluid'
  gap?: SpaceToken
  /** Minimum column width used only when `columns="fluid"`. */
  minColumnWidth?: string
}

const StyledGrid = styled.div<{ $columns: number | 'fluid'; $gap: SpaceToken; $minColumnWidth: string }>`
  display: grid;
  min-width: 0;
  max-width: 100%;
  grid-template-columns: ${(p) =>
    p.$columns === 'fluid'
      ? `repeat(auto-fit, minmax(min(100%, ${p.$minColumnWidth}), 1fr))`
      : `repeat(${p.$columns}, minmax(0, 1fr))`};
  gap: ${(p) => (p.theme?.space ?? footTheme.space)[p.$gap]};
`

export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  { columns = 'fluid', gap = 'lg', minColumnWidth = '17.5rem', ...rest },
  ref,
) {
  return (
    <StyledGrid ref={ref} $columns={columns} $gap={gap} $minColumnWidth={minColumnWidth} {...rest} />
  )
})
