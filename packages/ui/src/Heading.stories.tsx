import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './Heading'

const meta: Meta<typeof Heading> = {
  title: 'Typography/Heading',
  component: Heading,
  tags: ['autodocs'],
  argTypes: {
    as: { control: 'select', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  args: {
    children: 'Tableau de bord',
    as: 'h1',
    size: 'lg',
  },
}

export default meta
type Story = StoryObj<typeof Heading>

export const Default: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Heading {...args} size="xs">
        xs
      </Heading>
      <Heading {...args} size="sm">
        sm
      </Heading>
      <Heading {...args} size="md">
        md
      </Heading>
      <Heading {...args} size="lg">
        lg
      </Heading>
      <Heading {...args} size="xl">
        xl
      </Heading>
    </div>
  ),
}

export const DisplayFont: Story = {
  args: { display: true, size: 'xl', children: 'FOOT' },
}
