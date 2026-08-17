import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stepper } from './Stepper'

describe('Stepper', () => {
  it('marks the active step with aria-current', () => {
    render(
      <Stepper
        activeStep={1}
        steps={[{ label: 'Infos' }, { label: 'Paiement' }, { label: 'Confirmation' }]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).not.toHaveAttribute('aria-current')
  })
})
