import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './Text'

const meta: Meta<typeof Text> = {
  title: 'Typography/Text',
  component: Text,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
    weight: { control: 'select', options: ['regular', 'medium', 'bold'] },
    tone: { control: 'select', options: ['default', 'muted', 'danger', 'success'] },
  },
  args: {
    children: 'Description du club et de son historique.',
  },
}

export default meta
type Story = StoryObj<typeof Text>

export const Default: Story = {}

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <Text tone="default">Default</Text>
      <Text tone="muted">Muted</Text>
      <Text tone="danger">Danger</Text>
      <Text tone="success">Success</Text>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <Text size="xs">xs</Text>
      <Text size="sm">sm</Text>
      <Text size="md">md</Text>
      <Text size="lg">lg</Text>
    </div>
  ),
}

export const Weights: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <Text weight="regular">Regular</Text>
      <Text weight="medium">Medium</Text>
      <Text weight="bold">Bold</Text>
    </div>
  ),
}

export const Truncate: Story = {
  args: {
    truncate: true,
    children:
      "Un texte volontairement très long pour démontrer la troncature avec ellipsis sur une seule ligne quand l'espace est limité.",
  },
  render: (args) => (
    <div style={{ maxWidth: '16rem' }}>
      <Text {...args} />
    </div>
  ),
}
