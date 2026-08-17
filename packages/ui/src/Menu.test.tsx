import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Menu } from './Menu'
import { Button } from './Button'

const items = [
  { value: 'edit', label: 'Modifier' },
  { value: 'delete', label: 'Supprimer' },
]

describe('Menu', () => {
  it('opens the menu when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<Menu trigger={<Button>Actions</Button>} items={items} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Modifier' })).toBeInTheDocument()
  })

  it('calls onSelect and closes when an item is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Menu
        trigger={<Button>Actions</Button>}
        items={[{ value: 'edit', label: 'Modifier', onSelect }]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Modifier' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<Menu trigger={<Button>Actions</Button>} items={items} />)
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
