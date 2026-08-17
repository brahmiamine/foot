import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Popover } from './Popover'
import { Text } from './Text'

const meta: Meta<typeof Popover> = {
  title: 'Overlay/Popover',
  component: Popover,
  tags: ['autodocs'],
  argTypes: {
    align: { control: 'radio', options: ['start', 'end'] },
  },
  parameters: {
    docs: {
      description: {
        component: 'Click the trigger to open. Escape or an outside click closes it.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Popover>

const filtersContent = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <Text weight="bold" size="sm">
      Filtrer
    </Text>
    <Checkbox label="Ligue 1" defaultChecked />
    <Checkbox label="Ligue 2" />
  </div>
)

export const Default: Story = {
  render: (args) => <Popover {...args} content={filtersContent} trigger={<Button variant="secondary">Filtrer</Button>} />,
}

export const AlignEnd: Story = {
  render: (args) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Popover {...args} align="end" content={filtersContent} trigger={<Button variant="secondary">Filtrer</Button>} />
    </div>
  ),
}
