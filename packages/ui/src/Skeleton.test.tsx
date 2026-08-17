import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders as an aria-hidden placeholder', () => {
    const { container } = render(<Skeleton variant="circular" width={40} height={40} />)
    const node = container.firstElementChild as HTMLElement
    expect(node).toHaveAttribute('aria-hidden', 'true')
  })
})
