import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Divider } from './Divider'

describe('Divider', () => {
  it('renders a horizontal separator', () => {
    render(<Divider />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('renders a vertical separator', () => {
    render(<Divider orientation="vertical" />)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('renders a labeled separator', () => {
    render(<Divider label="OU" />)
    expect(screen.getByText('OU')).toBeInTheDocument()
  })
})
