import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { RadioGroup } from './RadioGroup'
import type { RadioGroupOption } from './RadioGroup'

const options: RadioGroupOption[] = [
  { value: 'licencie', label: 'Licencié' },
  { value: 'non-licencie', label: 'Non licencié' },
  { value: 'en-attente', label: 'En attente', disabled: true },
]

const meta: Meta<typeof RadioGroup> = {
  title: 'Forms/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
}

export default meta
type Story = StoryObj<typeof RadioGroup>

function ControlledRadioGroup(props: Partial<React.ComponentProps<typeof RadioGroup>>) {
  const [value, setValue] = useState('licencie')
  return <RadioGroup label="Statut" options={options} value={value} onChange={setValue} {...props} />
}

export const Default: Story = {
  render: (args) => <ControlledRadioGroup {...args} />,
}

export const Horizontal: Story = {
  render: (args) => <ControlledRadioGroup orientation="horizontal" {...args} />,
}

export const Disabled: Story = {
  render: (args) => <ControlledRadioGroup disabled {...args} />,
}
