import type { Meta, StoryObj } from '@storybook/react'
import { useRef } from 'react'
import { Checkbox } from './Checkbox'

const meta: Meta<typeof Checkbox> = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    label: "J'accepte les conditions",
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {}

export const Checked: Story = {
  args: { defaultChecked: true },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
}

function IndeterminateExample() {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Checkbox
      ref={ref}
      label="Sélection partielle"
      indeterminate
      onChange={() => {
        /* Storybook control example only */
      }}
    />
  )
}

export const Indeterminate: Story = {
  render: () => <IndeterminateExample />,
}

export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Checkbox label="Football" defaultChecked />
      <Checkbox label="Futsal" />
      <Checkbox label="Beach soccer" />
    </div>
  ),
}
