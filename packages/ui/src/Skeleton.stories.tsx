import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton } from './Skeleton'
import { Card } from './Card'

const meta: Meta<typeof Skeleton> = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['text', 'circular', 'rectangular'] },
  },
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Text: Story = {
  args: { variant: 'text' },
  render: (args) => (
    <div style={{ maxWidth: '16rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <Skeleton {...args} />
      <Skeleton {...args} width="80%" />
      <Skeleton {...args} width="60%" />
    </div>
  ),
}

export const Circular: Story = {
  args: { variant: 'circular', width: 48, height: 48 },
}

export const Rectangular: Story = {
  args: { variant: 'rectangular', width: '100%', height: 120 },
}

export const CardSkeleton: Story = {
  render: () => (
    <Card style={{ maxWidth: '20rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <Skeleton variant="circular" width={40} height={40} />
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={80} />
    </Card>
  ),
}
