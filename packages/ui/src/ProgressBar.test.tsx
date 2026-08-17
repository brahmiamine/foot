import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes progressbar semantics with the right value', () => {
    render(<ProgressBar value={30} max={100} label="Progression" />)
    const bar = screen.getByRole('progressbar', { name: 'Progression' })
    expect(bar).toHaveAttribute('aria-valuenow', '30')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps the displayed percentage between 0 and 100', () => {
    render(<ProgressBar value={150} max={100} label="Trop" showValueLabel />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
