import type { Meta, StoryObj } from '@storybook/react'
import { Spacer } from './Spacer'
import { Text } from './Text'

const meta: Meta<typeof Spacer> = {
  title: 'Layout/Spacer',
  component: Spacer,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] },
    axis: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
}

export default meta
type Story = StoryObj<typeof Spacer>

export const Vertical: Story = {
  args: { size: 'lg', axis: 'vertical' },
  render: (args) => (
    <div style={{ background: 'var(--foot-color-surface)' }}>
      <Text>Bloc au-dessus</Text>
      <Spacer {...args} />
      <Text>Bloc en dessous</Text>
    </div>
  ),
}

export const Horizontal: Story = {
  args: { size: 'lg', axis: 'horizontal' },
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Text>Gauche</Text>
      <Spacer {...args} />
      <Text>Droite</Text>
    </div>
  ),
}
