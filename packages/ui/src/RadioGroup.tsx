import { useId } from 'react'
import styled from 'styled-components'
import { Radio } from './Radio'

export interface RadioGroupOption {
  value: string
  label: string
  disabled?: boolean
}

export interface RadioGroupProps {
  name?: string
  options: RadioGroupOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  label?: string
  disabled?: boolean
  className?: string
}

const Fieldset = styled.fieldset`
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
`

const Legend = styled.legend`
  padding: 0;
  margin-bottom: 0.5rem;
  font-family: var(--foot-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--foot-color-text);
`

const Options = styled.div<{ $orientation: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${(p) => (p.$orientation === 'vertical' ? 'column' : 'row')};
  flex-wrap: wrap;
  gap: ${(p) => (p.$orientation === 'vertical' ? '0.5rem' : '1rem')};
`

export function RadioGroup({
  name,
  options,
  value,
  defaultValue,
  onChange,
  orientation = 'vertical',
  label,
  disabled,
  className,
}: RadioGroupProps) {
  const generatedName = useId()
  const groupName = name ?? generatedName
  const isControlled = value !== undefined

  return (
    <Fieldset className={className}>
      {label && <Legend>{label}</Legend>}
      <Options role="radiogroup" $orientation={orientation} aria-label={label}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={groupName}
            value={option.value}
            label={option.label}
            disabled={disabled || option.disabled}
            checked={isControlled ? value === option.value : undefined}
            defaultChecked={!isControlled ? defaultValue === option.value : undefined}
            onChange={(event) => {
              if (event.target.checked) onChange?.(option.value)
            }}
          />
        ))}
      </Options>
    </Fieldset>
  )
}
