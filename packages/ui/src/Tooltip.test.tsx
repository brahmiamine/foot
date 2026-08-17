import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip } from './Tooltip'
import { Button } from './Button'

describe('Tooltip', () => {
  it('shows the tooltip content on focus and hides it on blur', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Informations supplémentaires" delay={0}>
        <Button>Aide</Button>
      </Tooltip>,
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.tab()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Informations supplémentaires')

    await user.tab()
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
  })
})
