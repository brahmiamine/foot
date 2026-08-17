import type { Meta, StoryObj } from '@storybook/react'
import { Divider } from './Divider'
import { Text } from './Text'

const meta: Meta<typeof Divider> = {
  title: 'Data Display/Divider',
  component: Divider,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
}

export default meta
type Story = StoryObj<typeof Divider>

export const Horizontal: Story = {
  render: () => (
    <div style={{ maxWidth: '20rem' }}>
      <Text>Section précédente</Text>
      <Divider />
      <Text>Section suivante</Text>
    </div>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div style={{ maxWidth: '20rem' }}>
      <Divider label="OU" />
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', height: '2rem', alignItems: 'center' }}>
      <Text>Gauche</Text>
      <Divider orientation="vertical" />
      <Text>Droite</Text>
    </div>
  ),
}
