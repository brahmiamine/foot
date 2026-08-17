import type { Meta, StoryObj } from '@storybook/react'
import { Stepper } from './Stepper'
import type { StepItem } from './Stepper'

const steps: StepItem[] = [
  { label: 'Informations', description: 'Coordonnées du club' },
  { label: 'Paiement', description: 'Cotisation annuelle' },
  { label: 'Validation', description: 'Vérification fédérale' },
  { label: 'Confirmation' },
]

const meta: Meta<typeof Stepper> = {
  title: 'Navigation/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
  args: {
    steps,
    activeStep: 1,
  },
}

export default meta
type Story = StoryObj<typeof Stepper>

export const Horizontal: Story = {}

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <Stepper {...args} />
    </div>
  ),
}

export const FirstStep: Story = {
  args: { activeStep: 0 },
}

export const Complete: Story = {
  args: { activeStep: steps.length },
}
