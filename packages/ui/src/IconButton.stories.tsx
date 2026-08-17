import type { Meta, StoryObj } from '@storybook/react'
import { IconButton } from './IconButton'

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
  </svg>
)

const meta: Meta<typeof IconButton> = {
  title: 'Actions/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    icon: <TrashIcon />,
    'aria-label': 'Supprimer',
    variant: 'secondary',
    size: 'md',
  },
}

export default meta
type Story = StoryObj<typeof IconButton>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <IconButton {...args} variant="primary" />
      <IconButton {...args} variant="secondary" />
      <IconButton {...args} variant="danger" />
      <IconButton {...args} variant="ghost" />
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <IconButton {...args} size="sm" />
      <IconButton {...args} size="md" />
      <IconButton {...args} size="lg" />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
}
