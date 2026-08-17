import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('renders a searchbox', () => {
    render(<SearchInput aria-label="Recherche" value="" onChange={() => {}} />)
    expect(screen.getByRole('searchbox', { name: 'Recherche' })).toBeInTheDocument()
  })

  it('shows a clear button only when there is a value, and calls onClear', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const { rerender } = render(
      <SearchInput aria-label="Recherche" value="" onChange={() => {}} onClear={onClear} />,
    )
    expect(screen.queryByRole('button', { name: /effacer/i })).not.toBeInTheDocument()

    rerender(<SearchInput aria-label="Recherche" value="paris" onChange={() => {}} onClear={onClear} />)
    const clearButton = screen.getByRole('button', { name: /effacer/i })
    await user.click(clearButton)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
