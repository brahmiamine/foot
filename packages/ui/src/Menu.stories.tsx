import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { Menu } from './Menu'
import type { MenuItem } from './Menu'

const items: MenuItem[] = [
  { value: 'edit', label: 'Modifier', onSelect: () => console.log('edit') },
  { value: 'duplicate', label: 'Dupliquer', onSelect: () => console.log('duplicate') },
  { value: 'archive', label: 'Archiver', disabled: true },
  { value: 'delete', label: 'Supprimer', onSelect: () => console.log('delete') },
]

const meta: Meta<typeof Menu> = {
  title: 'Navigation/Menu',
  component: Menu,
  tags: ['autodocs'],
  argTypes: {
    align: { control: 'radio', options: ['start', 'end'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Click the trigger (or press ArrowDown/Enter/Space while focused) to open. ArrowUp/ArrowDown move focus, Escape or an outside click closes it.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Menu>

export const Default: Story = {
  render: (args) => <Menu {...args} items={items} trigger={<Button variant="secondary">Actions</Button>} />,
}

export const AlignEnd: Story = {
  render: (args) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Menu {...args} align="end" items={items} trigger={<Button variant="secondary">Actions</Button>} />
    </div>
  ),
}
