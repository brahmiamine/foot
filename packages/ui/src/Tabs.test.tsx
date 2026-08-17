import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from './Tabs'

const items = [
  { value: 'a', label: 'Aperçu', panel: <p>Panneau A</p> },
  { value: 'b', label: 'Détails', panel: <p>Panneau B</p> },
  { value: 'c', label: 'Historique', panel: <p>Panneau C</p> },
]

describe('Tabs', () => {
  it('shows the first panel by default', () => {
    render(<Tabs items={items} />)
    expect(screen.getByText('Panneau A')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Aperçu' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches panel on click and calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={items} onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Détails' }))
    expect(screen.getByText('Panneau B')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('supports arrow-key roving navigation', async () => {
    const user = userEvent.setup()
    render(<Tabs items={items} />)
    screen.getByRole('tab', { name: 'Aperçu' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Détails' })).toHaveFocus()
    expect(screen.getByText('Panneau B')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Aperçu' })).toHaveFocus()
  })

  it('wraps around with End/Home', async () => {
    const user = userEvent.setup()
    render(<Tabs items={items} />)
    screen.getByRole('tab', { name: 'Aperçu' }).focus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Historique' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Aperçu' })).toHaveFocus()
  })
})
