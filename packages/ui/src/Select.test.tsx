import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const options = [
  { value: 'fr', label: 'France' },
  { value: 'ma', label: 'Maroc' },
]

describe('Select', () => {
  it('renders options from the options prop', () => {
    render(<Select aria-label="Pays" options={options} />)
    expect(screen.getByRole('option', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Maroc' })).toBeInTheDocument()
  })

  it('changes the selected value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select aria-label="Pays" options={options} onChange={onChange} />)
    await user.selectOptions(screen.getByLabelText('Pays'), 'ma')
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByLabelText('Pays')).toHaveValue('ma')
  })

  it('supports custom children instead of options', () => {
    render(
      <Select aria-label="Custom">
        <option value="x">X</option>
      </Select>,
    )
    expect(screen.getByRole('option', { name: 'X' })).toBeInTheDocument()
  })
})
