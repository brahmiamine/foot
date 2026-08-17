import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children and defaults to primary/md', () => {
    render(<Button>Enregistrer</Button>)
    const button = screen.getByRole('button', { name: 'Enregistrer' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('type', 'button')
  })

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards a ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders start and end icons around the label', () => {
    render(
      <Button startIcon={<span data-testid="start" />} endIcon={<span data-testid="end" />}>
        Label
      </Button>,
    )
    expect(screen.getByTestId('start')).toBeInTheDocument()
    expect(screen.getByTestId('end')).toBeInTheDocument()
  })

  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>{variant}</Button>)
    expect(screen.getByRole('button', { name: variant })).toBeInTheDocument()
  })

  it('supports fullWidth', () => {
    render(<Button fullWidth>Full</Button>)
    expect(screen.getByRole('button', { name: 'Full' })).toBeInTheDocument()
  })
})
