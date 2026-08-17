import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from './Toast'

function Trigger() {
  const { toast } = useToast()
  return (
    <button type="button" onClick={() => toast({ title: 'Enregistré', description: 'Vos modifications sont sauvegardées' })}>
      Sauvegarder
    </button>
  )
}

describe('ToastProvider / useToast', () => {
  it('throws when useToast is used outside a provider', () => {
    const Broken = () => {
      useToast()
      return null
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Broken />)).toThrow(/ToastProvider/)
    spy.mockRestore()
  })

  it('shows a toast when triggered and dismisses it on close', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider defaultDuration={0}>
        <Trigger />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Sauvegarder' }))
    expect(await screen.findByText('Enregistré')).toBeInTheDocument()
    expect(screen.getByText('Vos modifications sont sauvegardées')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(screen.queryByText('Enregistré')).not.toBeInTheDocument())
  })

  it('auto-dismisses after the configured duration', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider defaultDuration={30}>
        <Trigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Sauvegarder' }))
    expect(screen.getByText('Enregistré')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByText('Enregistré')).not.toBeInTheDocument())
  })
})
