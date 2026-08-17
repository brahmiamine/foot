import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('exposes a status role with an accessible label', () => {
    render(<Spinner label="Chargement des données" />)
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des données')
  })
})
