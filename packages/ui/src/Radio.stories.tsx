import type { Meta, StoryObj } from '@storybook/react'
import { Radio } from './Radio'

const meta: Meta<typeof Radio> = {
  title: 'Forms/Radio',
  component: Radio,
  tags: ['autodocs'],
  args: {
    label: 'Licencié',
    name: 'storybook-radio',
  },
}

export default meta
type Story = StoryObj<typeof Radio>

export const Default: Story = {}

export const Checked: Story = {
  args: { defaultChecked: true },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Radio name="statut" label="Licencié" defaultChecked />
      <Radio name="statut" label="Non licencié" />
      <Radio name="statut" label="En attente" disabled />
    </div>
  ),
}
