import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { List, ListItem } from './List'

describe('List / ListItem', () => {
  it('renders a ul with items by default', () => {
    render(
      <List>
        <ListItem>Un</ListItem>
        <ListItem>Deux</ListItem>
      </List>,
    )
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders an ol when ordered', () => {
    const { container } = render(
      <List ordered>
        <ListItem>Un</ListItem>
      </List>,
    )
    expect(container.querySelector('ol')).toBeInTheDocument()
  })

  it('makes interactive items focusable and clickable', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <List>
        <ListItem interactive onClick={onClick}>
          Cliquable
        </ListItem>
      </List>,
    )
    const item = screen.getByRole('listitem')
    expect(item).toHaveAttribute('tabindex', '0')
    await user.click(screen.getByText('Cliquable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
