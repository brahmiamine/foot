import styled from 'styled-components'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  label?: string
  className?: string
}

const HorizontalRule = styled.hr`
  width: 100%;
  min-width: 0;
  margin: 0;
  border: 0;
  border-block-start: 1px solid var(--foot-color-border);
`

const VerticalRule = styled.span`
  display: inline-block;
  align-self: stretch;
  width: 1px;
  min-height: 1rem;
  background: var(--foot-color-border);
`

const LabeledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  color: var(--foot-color-text-muted);
  font-family: var(--foot-font-ui);
  font-size: 0.75rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--foot-color-border);
  }
`

export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return <VerticalRule role="separator" aria-orientation="vertical" className={className} />
  }
  if (label) {
    return (
      <LabeledWrapper role="separator" className={className}>
        {label}
      </LabeledWrapper>
    )
  }
  return <HorizontalRule className={className} />
}
