import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders as a native checkbox associated with its label', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="J'accepte" />)
    const checkbox = screen.getByRole('checkbox', { name: "J'accepte" })
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Option" onChange={onChange} />)
    await user.click(screen.getByRole('checkbox', { name: 'Option' }))
    expect(onChange).toHaveBeenCalled()
  })

  it('sets the indeterminate DOM property', () => {
    render(<Checkbox label="Partiel" indeterminate readOnly checked={false} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Partiel' }) as HTMLInputElement
    expect(checkbox.indeterminate).toBe(true)
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed')
  })

  it('blocks interaction when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Désactivé" disabled onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Désactivé' })
    expect(checkbox).toBeDisabled()
    await user.click(checkbox)
    expect(onChange).not.toHaveBeenCalled()
  })
})
