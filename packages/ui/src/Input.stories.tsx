import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'Forms/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Nom du club',
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {}

export const WithValue: Story = {
  args: { defaultValue: 'AS Monaco' },
}

export const Invalid: Story = {
  args: { invalid: true, defaultValue: 'valeur invalide' },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Non modifiable' },
}

export const Types: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '20rem' }}>
      <Input type="text" placeholder="Texte" />
      <Input type="email" placeholder="email@club.fr" />
      <Input type="password" placeholder="Mot de passe" />
      <Input type="number" placeholder="42" />
      <Input type="date" />
    </div>
  ),
}
