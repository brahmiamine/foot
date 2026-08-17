import type { Meta, StoryObj } from '@storybook/react'
import { Select } from './Select'

const options = [
  { value: 'fr', label: 'France' },
  { value: 'be', label: 'Belgique' },
  { value: 'ch', label: 'Suisse' },
  { value: 'ma', label: 'Maroc', disabled: true },
]

const meta: Meta<typeof Select> = {
  title: 'Forms/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    options,
  },
}

export default meta
type Story = StoryObj<typeof Select>

export const Default: Story = {}

export const WithSelectedValue: Story = {
  args: { defaultValue: 'be' },
}

export const Invalid: Story = {
  args: { invalid: true },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const CustomChildren: Story = {
  render: () => (
    <Select defaultValue="u15">
      <optgroup label="Catégories jeunes">
        <option value="u13">U13</option>
        <option value="u15">U15</option>
        <option value="u17">U17</option>
      </optgroup>
      <optgroup label="Seniors">
        <option value="seniors">Seniors</option>
      </optgroup>
    </Select>
  ),
}
