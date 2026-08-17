import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders title and content', () => {
    render(<Alert title="Titre">Le message</Alert>)
    expect(screen.getByText('Titre')).toBeInTheDocument()
    expect(screen.getByText('Le message')).toBeInTheDocument()
  })

  it('uses role="status" for info/success', () => {
    render(<Alert variant="success">OK</Alert>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('uses role="alert" for warning/danger', () => {
    render(<Alert variant="danger">Erreur</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
