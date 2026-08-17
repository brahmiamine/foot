import styled from 'styled-components'
import type { SpaceToken } from './Stack'
import { footTheme } from './theme'

export interface SpacerProps {
  size?: SpaceToken
  axis?: 'horizontal' | 'vertical'
  className?: string
}

const StyledSpacer = styled.span<{ $size: SpaceToken; $axis: 'horizontal' | 'vertical' }>`
  display: block;
  flex-shrink: 0;
  width: ${(p) => (p.$axis === 'horizontal' ? (p.theme?.space ?? footTheme.space)[p.$size] : '1px')};
  height: ${(p) => (p.$axis === 'horizontal' ? '1px' : (p.theme?.space ?? footTheme.space)[p.$size])};
`

/** A dedicated block used to add breathing room without margin hacks. */
export function Spacer({ size = 'md', axis = 'vertical', className }: SpacerProps) {
  return <StyledSpacer $size={size} $axis={axis} className={className} aria-hidden="true" />
}
