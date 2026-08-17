import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders and accepts typed text', async () => {
    const user = userEvent.setup()
    render(<Input aria-label="Nom" />)
    const input = screen.getByLabelText('Nom')
    await user.type(input, 'Amine')
    expect(input).toHaveValue('Amine')
  })

  it('marks itself invalid via aria-invalid', () => {
    render(<Input aria-label="Email" invalid />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('respects an explicit aria-invalid override', () => {
    render(<Input aria-label="Email" invalid={false} aria-invalid="true" />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('calls onChange handlers', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input aria-label="Champ" onChange={onChange} />)
    await user.type(screen.getByLabelText('Champ'), 'x')
    expect(onChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop set', () => {
    render(<Input aria-label="Champ" disabled />)
    expect(screen.getByLabelText('Champ')).toBeDisabled()
  })
})
