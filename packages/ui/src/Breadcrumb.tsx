import type { ReactNode } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface BreadcrumbItem {
  label: ReactNode
  href?: string
  onClick?: () => void
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: ReactNode
  className?: string
}

const Nav = styled.nav`
  min-width: 0;
  max-width: 100%;
`

const Ol = styled.ol`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--foot-font-ui);
  font-size: 0.8125rem;
`

const Crumb = styled.li`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
`

const Separator = styled.span`
  color: var(--foot-color-text-muted);
`

const CrumbLink = styled.a`
  color: var(--foot-color-text-muted);
  text-decoration: none;
  border-radius: var(--foot-radius-sm);

  &:hover {
    color: var(--foot-color-primary);
    text-decoration: underline;
  }

  ${focusRing}
`

const CurrentCrumb = styled.span`
  color: var(--foot-color-text);
  font-weight: 700;
  overflow-wrap: anywhere;
`

export function Breadcrumb({ items, separator = '/', className }: BreadcrumbProps) {
  return (
    <Nav aria-label="Fil d'ariane" className={className}>
      <Ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <Crumb key={index}>
              {isLast || (!item.href && !item.onClick) ? (
                <CurrentCrumb aria-current={isLast ? 'page' : undefined}>{item.label}</CurrentCrumb>
              ) : (
                <CrumbLink
                  href={item.href ?? '#'}
                  onClick={(event) => {
                    if (item.onClick) {
                      event.preventDefault()
                      item.onClick()
                    }
                  }}
                >
                  {item.label}
                </CrumbLink>
              )}
              {!isLast && <Separator aria-hidden="true">{separator}</Separator>}
            </Crumb>
          )
        })}
      </Ol>
    </Nav>
  )
}
