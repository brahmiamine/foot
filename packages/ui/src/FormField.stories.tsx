import type { Meta, StoryObj } from '@storybook/react'
import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'
import { Textarea } from './Textarea'

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
  tags: ['autodocs'],
  args: {
    label: 'Email',
  },
}

export default meta
type Story = StoryObj<typeof FormField>

export const Default: Story = {
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <FormField {...args}>
        <Input type="email" placeholder="club@federation.fr" />
      </FormField>
    </div>
  ),
}

export const WithHelperText: Story = {
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <FormField {...args} helperText="Utilisé pour les notifications officielles.">
        <Input type="email" placeholder="club@federation.fr" />
      </FormField>
    </div>
  ),
}

export const WithError: Story = {
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <FormField {...args} errorText="Ce champ est requis.">
        <Input type="email" />
      </FormField>
    </div>
  ),
}

export const Required: Story = {
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <FormField {...args} required>
        <Input type="email" placeholder="club@federation.fr" />
      </FormField>
    </div>
  ),
}

export const WithTextarea: Story = {
  render: () => (
    <div style={{ maxWidth: '24rem' }}>
      <FormField label="Description" helperText="200 caractères maximum.">
        <Textarea placeholder="Description du club" />
      </FormField>
    </div>
  ),
}

export const WithSelect: Story = {
  render: () => (
    <div style={{ maxWidth: '20rem' }}>
      <FormField label="Pays" required>
        <Select options={[{ value: 'fr', label: 'France' }, { value: 'be', label: 'Belgique' }]} />
      </FormField>
    </div>
  ),
}
