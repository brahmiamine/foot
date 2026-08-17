import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renders with role=switch and toggles on click', async () => {
    const user = userEvent.setup()
    render(<Switch label="Notifications" />)
    const toggle = screen.getByRole('switch', { name: 'Notifications' })
    expect(toggle).not.toBeChecked()
    await user.click(toggle)
    expect(toggle).toBeChecked()
  })

  it('calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch label="Mode sombre" onChange={onChange} />)
    await user.click(screen.getByRole('switch', { name: 'Mode sombre' }))
    expect(onChange).toHaveBeenCalled()
  })

  it('blocks interaction when disabled', async () => {
    const user = userEvent.setup()
    render(<Switch label="Verrouillé" disabled />)
    const toggle = screen.getByRole('switch', { name: 'Verrouillé' })
    await user.click(toggle)
    expect(toggle).not.toBeChecked()
  })
})
