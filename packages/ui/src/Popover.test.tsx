import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Popover } from './Popover'
import { Button } from './Button'

describe('Popover', () => {
  it('toggles open state when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<Popover trigger={<Button>Filtrer</Button>} content={<p>Filtres avancés</p>} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filtrer' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Filtres avancés')

    await user.click(screen.getByRole('button', { name: 'Filtrer' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<Popover trigger={<Button>Filtrer</Button>} content={<p>Filtres avancés</p>} />)
    await user.click(screen.getByRole('button', { name: 'Filtrer' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Popover trigger={<Button>Filtrer</Button>} content={<p>Filtres avancés</p>} />
        <button type="button">Ailleurs</button>
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Filtrer' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ailleurs' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
