import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from './FormField'
import { Input } from './Input'

describe('FormField', () => {
  it('associates the label with the control via htmlFor/id', () => {
    render(
      <FormField label="Email" helperText="Nous ne le partagerons jamais">
        <Input />
      </FormField>,
    )
    const input = screen.getByLabelText('Email')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('Nous ne le partagerons jamais')
  })

  it('shows the error text instead of helper text and marks the field invalid', () => {
    render(
      <FormField label="Email" helperText="Aide" errorText="Champ requis">
        <Input />
      </FormField>,
    )
    const input = screen.getByLabelText('Email')
    expect(screen.getByRole('alert')).toHaveTextContent('Champ requis')
    expect(screen.queryByText('Aide')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders a required marker', () => {
    render(
      <FormField label="Nom" required>
        <Input />
      </FormField>,
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })
})
