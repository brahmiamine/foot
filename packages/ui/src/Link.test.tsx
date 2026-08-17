import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Link } from './Link'

describe('Link', () => {
  it('renders an anchor with href', () => {
    render(<Link href="/accueil">Accueil</Link>)
    const link = screen.getByRole('link', { name: 'Accueil' })
    expect(link).toHaveAttribute('href', '/accueil')
  })

  it('adds rel=noopener noreferrer when target=_blank and rel is not set', () => {
    render(
      <Link href="https://example.com" target="_blank">
        Externe
      </Link>,
    )
    expect(screen.getByRole('link', { name: 'Externe' })).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('preserves an explicit rel', () => {
    render(
      <Link href="https://example.com" target="_blank" rel="nofollow">
        Externe
      </Link>,
    )
    expect(screen.getByRole('link', { name: 'Externe' })).toHaveAttribute('rel', 'nofollow')
  })
})
