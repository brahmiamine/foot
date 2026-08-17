import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Slider } from './Slider'

describe('Slider', () => {
  it('renders a range input with the given value', () => {
    render(<Slider aria-label="Volume" min={0} max={100} value={40} readOnly />)
    const slider = screen.getByRole('slider', { name: 'Volume' })
    expect(slider).toHaveAttribute('type', 'range')
    expect(slider).toHaveValue('40')
  })
})
