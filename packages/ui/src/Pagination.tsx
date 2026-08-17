import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  siblingCount?: number
  className?: string
}

const Nav = styled.nav`
  min-width: 0;
  max-width: 100%;
`

const List = styled.ul`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const PageButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0 0.5rem;
  border: 1px solid ${(p) => (p.$active ? 'var(--foot-color-primary)' : 'var(--foot-color-border)')};
  border-radius: var(--foot-radius-sm);
  background: ${(p) => (p.$active ? 'var(--foot-color-primary)' : 'var(--foot-color-surface)')};
  color: ${(p) => (p.$active ? '#fff' : 'var(--foot-color-text)')};
  font-family: var(--foot-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: var(--foot-color-primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${focusRing}

  @media (max-width: 640px) {
    min-width: var(--foot-touch-target);
    min-height: var(--foot-touch-target);
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;
  }
`

const Ellipsis = styled.span`
  padding: 0 0.35rem;
  color: var(--foot-color-text-muted);
`

function getPageRange(page: number, pageCount: number, siblingCount: number): (number | 'ellipsis')[] {
  const totalVisible = siblingCount * 2 + 5
  if (pageCount <= totalVisible) {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }

  const left = Math.max(page - siblingCount, 2)
  const right = Math.min(page + siblingCount, pageCount - 1)

  const range: (number | 'ellipsis')[] = [1]
  if (left > 2) range.push('ellipsis')
  for (let i = left; i <= right; i += 1) range.push(i)
  if (right < pageCount - 1) range.push('ellipsis')
  range.push(pageCount)
  return range
}

export function Pagination({ page, pageCount, onPageChange, siblingCount = 1, className }: PaginationProps) {
  const range = getPageRange(page, pageCount, siblingCount)

  return (
    <Nav aria-label="Pagination" className={className}>
      <List>
        <li>
          <PageButton
            type="button"
            aria-label="Page précédente"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </PageButton>
        </li>
        {range.map((item, index) =>
          item === 'ellipsis' ? (
            <li key={`ellipsis-${index}`}>
              <Ellipsis aria-hidden="true">…</Ellipsis>
            </li>
          ) : (
            <li key={item}>
              <PageButton
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                $active={item === page}
                onClick={() => onPageChange(item)}
              >
                {item}
              </PageButton>
            </li>
          ),
        )}
        <li>
          <PageButton
            type="button"
            aria-label="Page suivante"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </PageButton>
        </li>
      </List>
    </Nav>
  )
}
