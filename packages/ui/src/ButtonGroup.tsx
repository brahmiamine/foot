import type { HTMLAttributes } from 'react'
import styled, { css } from 'styled-components'

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  /** Visually attaches the children edge-to-edge instead of spacing them apart. */
  attached?: boolean
}

const StyledGroup = styled.div<{ $orientation: 'horizontal' | 'vertical'; $attached: boolean }>`
  display: inline-flex;
  flex-direction: ${(p) => (p.$orientation === 'vertical' ? 'column' : 'row')};
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
  gap: ${(p) => (p.$attached ? '0' : '0.5rem')};

  ${(p) =>
    p.$attached &&
    css`
      > * {
        border-radius: 0;
      }

      > *:first-child {
        border-start-start-radius: var(--foot-radius-sm);
        border-end-start-radius: ${p.$orientation === 'vertical' ? '0' : 'var(--foot-radius-sm)'};
        border-start-end-radius: ${p.$orientation === 'vertical' ? 'var(--foot-radius-sm)' : '0'};
      }

      > *:last-child {
        border-end-end-radius: var(--foot-radius-sm);
        border-start-end-radius: ${p.$orientation === 'vertical' ? '0' : 'var(--foot-radius-sm)'};
        border-end-start-radius: ${p.$orientation === 'vertical' ? 'var(--foot-radius-sm)' : '0'};
      }

      ${p.$orientation === 'horizontal'
        ? css`
            > * + * {
              margin-inline-start: -1px;
            }
          `
        : css`
            > * + * {
              margin-block-start: -1px;
            }
          `}
    `}
`

export function ButtonGroup({ orientation = 'horizontal', attached = false, role = 'group', ...rest }: ButtonGroupProps) {
  return <StyledGroup role={role} $orientation={orientation} $attached={attached} {...rest} />
}
