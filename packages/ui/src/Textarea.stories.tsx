import type { Meta, StoryObj } from '@storybook/react'
import { Textarea } from './Textarea'

const meta: Meta<typeof Textarea> = {
  title: 'Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    placeholder: 'Description',
  },
}

export default meta
type Story = StoryObj<typeof Textarea>

export const Default: Story = {}

export const WithValue: Story = {
  args: {
    defaultValue:
      "Club fondé en 1924, évoluant en Ligue Régionale, avec une école de football labellisée FFF.",
  },
}

export const Invalid: Story = {
  args: { invalid: true, defaultValue: 'Contenu invalide' },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Non modifiable' },
}
