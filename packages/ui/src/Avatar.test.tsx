import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders initials when no image is provided', () => {
    render(<Avatar name="Amine Brahmi" />)
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('renders an image when src is provided', () => {
    render(<Avatar src="https://example.com/a.png" name="Amine Brahmi" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/a.png')
  })

  it('falls back to initials if the image fails to load', () => {
    render(<Avatar src="https://example.com/broken.png" name="Amine Brahmi" />)
    const img = screen.getByRole('img') as HTMLImageElement
    fireEvent.error(img)
    expect(screen.getByText('AB')).toBeInTheDocument()
  })
})
