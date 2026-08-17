import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Contenu</Card>)
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })

  it('is not focusable by default', () => {
    render(<Card data-testid="card">Contenu</Card>)
    expect(screen.getByTestId('card')).not.toHaveAttribute('tabindex')
  })

  it('becomes focusable and clickable when interactive', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Card interactive onClick={onClick} data-testid="card">
        Contenu
      </Card>,
    )
    const card = screen.getByTestId('card')
    expect(card).toHaveAttribute('tabindex', '0')
    await user.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it.each(['none', 'sm', 'md', 'lg'] as const)('accepts %s padding', (padding) => {
    render(
      <Card padding={padding} data-testid="card">
        Contenu
      </Card>,
    )
    expect(screen.getByTestId('card')).toBeInTheDocument()
  })
})
