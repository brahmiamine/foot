import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { ToastProvider, useToast } from './Toast'
import type { ToastVariant } from './Toast'

const meta: Meta<typeof ToastProvider> = {
  title: 'Feedback/Toast',
  component: ToastProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Mount `<ToastProvider>` once near the root, then call `const { toast } = useToast()` from any descendant to push a toast. This story wraps a small demo component in its own provider.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ToastProvider>

function ToastDemo() {
  const { toast } = useToast()

  const variants: { variant: ToastVariant; title: string; description: string }[] = [
    { variant: 'neutral', title: 'Notification', description: 'Un nouveau message est arrivé.' },
    { variant: 'success', title: 'Fait !', description: 'Le club a été créé avec succès.' },
    { variant: 'warning', title: 'Vérifiez', description: 'Certains champs sont incomplets.' },
    { variant: 'danger', title: 'Erreur', description: "L'enregistrement a échoué." },
    { variant: 'info', title: 'Info', description: 'La saison démarre le 5 septembre.' },
  ]

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {variants.map(({ variant, title, description }) => (
        <Button key={variant} variant="secondary" onClick={() => toast({ title, description, variant })}>
          Afficher « {variant} »
        </Button>
      ))}
    </div>
  )
}

export const Interactive: Story = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
}

function PersistentToastDemo() {
  const { toast } = useToast()
  return (
    <Button
      onClick={() =>
        toast({
          title: 'Nécessite une action',
          description: "Ce toast ne se ferme pas automatiquement (duration: 0).",
          variant: 'warning',
          duration: 0,
        })
      }
    >
      Afficher un toast persistant
    </Button>
  )
}

export const PersistentDuration: Story = {
  render: () => (
    <ToastProvider>
      <PersistentToastDemo />
    </ToastProvider>
  ),
}
