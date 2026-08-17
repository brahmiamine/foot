import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge>Actif</Badge>)
    expect(screen.getByText('Actif')).toBeInTheDocument()
  })

  it.each(['neutral', 'success', 'warning', 'danger', 'info'] as const)('renders the %s variant', (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>)
    expect(screen.getByText(variant)).toBeInTheDocument()
  })
})
