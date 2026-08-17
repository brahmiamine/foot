import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'
import { Button } from './Button'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Titre">
        Contenu
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders as a modal dialog when open, with focus moved inside', async () => {
    render(
      <Modal open onClose={() => {}} title="Confirmer">
        <Button>Valider</Button>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Confirmer' })).toBeInTheDocument()
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirmer">
        Contenu
      </Modal>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the overlay and the close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirmer">
        Contenu
      </Modal>,
    )
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab focus within the dialog', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={() => {}} title="Confirmer" footer={<Button>Valider</Button>}>
        Contenu
      </Modal>,
    )
    const closeButton = screen.getByRole('button', { name: 'Fermer' })
    const confirmButton = screen.getByRole('button', { name: 'Valider' })

    expect(document.activeElement).toBe(closeButton)
    await user.tab()
    expect(document.activeElement).toBe(confirmButton)
    await user.tab()
    expect(document.activeElement).toBe(closeButton)
  })
})
