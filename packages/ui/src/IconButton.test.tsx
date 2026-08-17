import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('requires and exposes an accessible name', () => {
    render(<IconButton icon={<span aria-hidden="true">x</span>} aria-label="Supprimer" />)
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument()
  })

  it('fires onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IconButton icon={<span />} aria-label="Fermer" onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
