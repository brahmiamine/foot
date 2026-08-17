import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'
import { Button } from './Button'

describe('EmptyState', () => {
  it('renders title, description and an action', () => {
    render(
      <EmptyState
        title="Aucun résultat"
        description="Essayez une autre recherche"
        action={<Button>Réinitialiser</Button>}
      />,
    )
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
    expect(screen.getByText('Essayez une autre recherche')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeInTheDocument()
  })
})
