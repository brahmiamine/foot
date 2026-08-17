import type { Meta, StoryObj } from '@storybook/react'
import { Slider } from './Slider'

const meta: Meta<typeof Slider> = {
  title: 'Forms/Slider',
  component: Slider,
  tags: ['autodocs'],
  args: {
    min: 0,
    max: 100,
    defaultValue: 50,
  },
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <Slider {...args} />
    </div>
  ),
}

export default meta
type Story = StoryObj<typeof Slider>

export const Default: Story = {}

export const Disabled: Story = {
  args: { disabled: true },
}

export const SteppedRange: Story = {
  args: { min: 0, max: 10, step: 1, defaultValue: 4 },
}
