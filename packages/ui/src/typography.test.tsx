import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heading } from './Heading'
import { Text } from './Text'

describe('Typography', () => {
  it('Heading renders an h2 by default and respects the as prop', () => {
    render(<Heading>Titre</Heading>)
    expect(screen.getByRole('heading', { level: 2, name: 'Titre' })).toBeInTheDocument()
  })

  it('Heading can render as h1', () => {
    render(<Heading as="h1">Titre principal</Heading>)
    expect(screen.getByRole('heading', { level: 1, name: 'Titre principal' })).toBeInTheDocument()
  })

  it('Text renders as a paragraph by default and supports as="span"', () => {
    const { container } = render(<Text as="span">Texte</Text>)
    expect(container.querySelector('span')).toHaveTextContent('Texte')
  })
})
