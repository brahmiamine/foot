import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'Data Display/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  args: {
    name: 'Amine Brahmi',
    size: 'md',
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Initials: Story = {}

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/128?img=12',
    alt: 'Amine Brahmi',
  },
}

export const BrokenImageFallback: Story = {
  args: {
    src: 'https://invalid.example/does-not-exist.jpg',
  },
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
      <Avatar {...args} size="xl" />
    </div>
  ),
}

export const NoName: Story = {
  args: { name: undefined },
}
