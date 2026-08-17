import { forwardRef } from 'react'
import type { HTMLAttributes, LiHTMLAttributes, ReactNode, Ref } from 'react'
import styled, { css } from 'styled-components'
import { focusRing } from './internal/mixins'

export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  /** Renders `<ol>` instead of `<ul>` and shows ordinal counters. */
  ordered?: boolean
  bordered?: boolean
}

export interface ListItemProps extends LiHTMLAttributes<HTMLLIElement> {
  startContent?: ReactNode
  endContent?: ReactNode
  interactive?: boolean
}

const listBaseStyles = css`
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--foot-font-ui);
  color: var(--foot-color-text);
`

const StyledUl = styled.ul<{ $bordered: boolean }>`
  ${listBaseStyles}
  ${(p) =>
    p.$bordered &&
    css`
      border: 1px solid var(--foot-color-border);
      border-radius: var(--foot-radius-md);
      overflow: hidden;

      > li + li {
        border-block-start: 1px solid var(--foot-color-border);
      }
    `}
`

const StyledOl = styled.ol<{ $bordered: boolean }>`
  ${listBaseStyles}
  ${(p) =>
    p.$bordered &&
    css`
      border: 1px solid var(--foot-color-border);
      border-radius: var(--foot-radius-md);
      overflow: hidden;

      > li + li {
        border-block-start: 1px solid var(--foot-color-border);
      }
    `}
`

const StyledLi = styled.li<{ $interactive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  line-height: 1.4;

  ${(p) =>
    p.$interactive &&
    css`
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background: var(--foot-color-background);
      }

      ${focusRing}

      @media (prefers-reduced-motion: reduce) {
        transition-duration: 0.001ms;
      }
    `}
`

const Content = styled.span`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
`

export const List = forwardRef<HTMLUListElement | HTMLOListElement, ListProps>(function List(
  { ordered = false, bordered = false, ...rest },
  ref,
) {
  if (ordered) {
    return <StyledOl ref={ref as Ref<HTMLOListElement>} $bordered={bordered} {...rest} />
  }
  return <StyledUl ref={ref as Ref<HTMLUListElement>} $bordered={bordered} {...rest} />
})

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { startContent, endContent, interactive = false, children, tabIndex, ...rest },
  ref,
) {
  return (
    <StyledLi
      ref={ref}
      $interactive={interactive}
      tabIndex={interactive ? (tabIndex ?? 0) : tabIndex}
      {...rest}
    >
      {startContent}
      <Content>{children}</Content>
      {endContent}
    </StyledLi>
  )
})
