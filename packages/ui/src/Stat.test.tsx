import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stat } from './Stat'

describe('Stat', () => {
  it('renders label, value and delta', () => {
    render(<Stat label="Licenciés" value="1 240" delta="+4.2%" trend="up" />)
    expect(screen.getByText('Licenciés')).toBeInTheDocument()
    expect(screen.getByText('1 240')).toBeInTheDocument()
    expect(screen.getByText('+4.2%')).toBeInTheDocument()
  })
})
