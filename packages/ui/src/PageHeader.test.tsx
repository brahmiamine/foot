import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'
import { Button } from './Button'

describe('PageHeader', () => {
  it('renders title, description and actions', () => {
    render(
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble"
        actions={<Button>Nouveau</Button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
    expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nouveau' })).toBeInTheDocument()
  })

  it('omits description/actions when not provided', () => {
    render(<PageHeader title="Titre seul" />)
    expect(screen.getByRole('heading', { name: 'Titre seul' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
