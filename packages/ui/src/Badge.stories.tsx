import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'Data Display/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['neutral', 'success', 'warning', 'danger', 'info'] },
  },
  args: {
    variant: 'success',
    children: 'Actif',
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="success">Actif</Badge>
      <Badge variant="warning">En attente</Badge>
      <Badge variant="danger">Suspendu</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
}
