import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import styled from 'styled-components'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  striped?: boolean
  compact?: boolean
}

const ScrollWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--foot-color-border);
  border-radius: var(--foot-radius-md);
`

const StyledTable = styled.table<{ $striped: boolean; $compact: boolean }>`
  width: 100%;
  min-width: 32rem;
  border-collapse: collapse;
  font-family: var(--foot-font-ui);
  font-size: 0.875rem;
  color: var(--foot-color-text);

  th,
  td {
    padding: ${(p) => (p.$compact ? '0.5rem 0.75rem' : '0.75rem 1rem')};
    text-align: start;
    vertical-align: middle;
    overflow-wrap: anywhere;
  }

  thead th {
    background: var(--foot-color-background);
    color: var(--foot-color-text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-block-end: 1px solid var(--foot-color-border);
    position: sticky;
    inset-block-start: 0;
  }

  tbody tr {
    border-block-end: 1px solid var(--foot-color-border);
  }

  tbody tr:last-child {
    border-block-end: 0;
  }

  ${(p) =>
    p.$striped &&
    `
    tbody tr:nth-child(even) {
      background: var(--foot-color-background);
    }
  `}
`

export function Table({ striped = false, compact = false, children, ...rest }: TableProps) {
  return (
    <ScrollWrapper>
      <StyledTable $striped={striped} $compact={compact} {...rest}>
        {children}
      </StyledTable>
    </ScrollWrapper>
  )
}

export const TableHead = styled.thead``
export const TableBody = styled.tbody``
export const TableRow = styled.tr``
export function TableHeaderCell(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} />
}
export function TableCell(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} />
}
