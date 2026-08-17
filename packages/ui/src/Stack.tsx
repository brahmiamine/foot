import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import styled from 'styled-components'
import type { FootTheme } from './theme'
import { footTheme } from './theme'

export type SpaceToken = keyof FootTheme['space']

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column'
  gap?: SpaceToken
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
  wrap?: boolean
}

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
}

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
}

interface StyledStackProps {
  $direction: 'row' | 'column'
  $gap: SpaceToken
  $align: NonNullable<StackProps['align']>
  $justify: NonNullable<StackProps['justify']>
  $wrap: boolean
}

/** Stack is styled-components driven but reads the theme with a safe
 * fallback to `footTheme` so it renders correctly with or without
 * `FootThemeProvider` mounted. */
const StyledStack = styled.div<StyledStackProps>`
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-direction: ${(p) => p.$direction};
  flex-wrap: ${(p) => (p.$wrap ? 'wrap' : 'nowrap')};
  align-items: ${(p) => alignMap[p.$align]};
  justify-content: ${(p) => justifyMap[p.$justify]};
  gap: ${(p) => (p.theme?.space ?? footTheme.space)[p.$gap]};
`

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { direction = 'column', gap = 'md', align = 'stretch', justify = 'start', wrap = false, ...rest },
  ref,
) {
  return (
    <StyledStack
      ref={ref}
      $direction={direction}
      $gap={gap}
      $align={align}
      $justify={justify}
      $wrap={wrap}
      {...rest}
    />
  )
})
