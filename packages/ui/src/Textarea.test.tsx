import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('accepts multi-line text', async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="Notes" />)
    const textarea = screen.getByLabelText('Notes')
    await user.type(textarea, 'ligne 1{enter}ligne 2')
    expect(textarea).toHaveValue('ligne 1\nligne 2')
  })

  it('marks itself invalid', () => {
    render(<Textarea aria-label="Notes" invalid />)
    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-invalid', 'true')
  })
})
