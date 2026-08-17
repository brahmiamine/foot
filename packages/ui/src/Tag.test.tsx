import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tag } from './Tag'

describe('Tag', () => {
  it('renders its label', () => {
    render(<Tag>U15</Tag>)
    expect(screen.getByText('U15')).toBeInTheDocument()
  })

  it('shows a remove button and calls onRemove', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<Tag onRemove={onRemove}>U15</Tag>)
    await user.click(screen.getByRole('button', { name: 'Retirer' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('does not render a remove button when onRemove is absent', () => {
    render(<Tag>U15</Tag>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
