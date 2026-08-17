import type { Meta, StoryObj } from '@storybook/react'
import { Alert } from './Alert'

const meta: Meta<typeof Alert> = {
  title: 'Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
  },
  args: {
    variant: 'info',
    title: 'Enregistré',
    children: 'Les modifications sont sauvegardées.',
  },
}

export default meta
type Story = StoryObj<typeof Alert>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '28rem' }}>
      <Alert variant="info" title="Information">
        Le championnat débute le 5 septembre.
      </Alert>
      <Alert variant="success" title="Enregistré">
        Les modifications sont sauvegardées.
      </Alert>
      <Alert variant="warning" title="Attention">
        La licence expire dans 15 jours.
      </Alert>
      <Alert variant="danger" title="Erreur">
        Le paiement a échoué, veuillez réessayer.
      </Alert>
    </div>
  ),
}

export const WithoutTitle: Story = {
  args: { title: undefined, children: 'Un message sans titre.' },
}
