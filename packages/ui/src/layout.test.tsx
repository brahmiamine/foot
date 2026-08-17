import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Container } from './Container'
import { Stack } from './Stack'
import { Grid } from './Grid'
import { Spacer } from './Spacer'

describe('Layout primitives', () => {
  it('Container renders its children', () => {
    render(
      <Container data-testid="container">
        <p>Contenu</p>
      </Container>,
    )
    expect(screen.getByTestId('container')).toContainElement(screen.getByText('Contenu'))
  })

  it('Stack renders children in a flex row/column', () => {
    render(
      <Stack data-testid="stack" direction="row" gap="lg">
        <span>A</span>
        <span>B</span>
      </Stack>,
    )
    const stack = screen.getByTestId('stack')
    expect(stack).toBeInTheDocument()
    expect(stack).not.toHaveAttribute('gap')
    expect(stack).not.toHaveAttribute('direction')
  })

  it('Grid renders a fluid grid by default', () => {
    render(
      <Grid data-testid="grid">
        <span>A</span>
      </Grid>,
    )
    expect(screen.getByTestId('grid')).toBeInTheDocument()
  })

  it('Spacer renders as a block element', () => {
    const { container } = render(<Spacer size="lg" />)
    expect(container.firstElementChild?.tagName).toBe('SPAN')
  })
})
