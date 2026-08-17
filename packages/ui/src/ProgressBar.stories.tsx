import type { Meta, StoryObj } from '@storybook/react'
import { ProgressBar } from './ProgressBar'

const meta: Meta<typeof ProgressBar> = {
  title: 'Feedback/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'success', 'warning', 'danger'] },
  },
  args: {
    value: 40,
    max: 100,
    label: 'Dossiers traités',
    showValueLabel: true,
  },
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <ProgressBar {...args} />
    </div>
  ),
}

export default meta
type Story = StoryObj<typeof ProgressBar>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '20rem' }}>
      <ProgressBar value={30} variant="primary" label="Primary" showValueLabel />
      <ProgressBar value={75} variant="success" label="Success" showValueLabel />
      <ProgressBar value={55} variant="warning" label="Warning" showValueLabel />
      <ProgressBar value={15} variant="danger" label="Danger" showValueLabel />
    </div>
  ),
}

export const WithoutLabel: Story = {
  args: { label: undefined, showValueLabel: false },
}

export const Complete: Story = {
  args: { value: 100 },
}
