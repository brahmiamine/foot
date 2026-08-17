import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { List, ListItem } from './List'

const meta: Meta<typeof List> = {
  title: 'Data Display/List',
  component: List,
  tags: ['autodocs'],
  argTypes: {
    ordered: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof List>

export const Default: Story = {
  render: (args) => (
    <List {...args} style={{ maxWidth: '20rem' }}>
      <ListItem>AS Monaco</ListItem>
      <ListItem>Olympique de Marseille</ListItem>
      <ListItem>FC Nantes</ListItem>
    </List>
  ),
}

export const Bordered: Story = {
  args: { bordered: true },
  render: Default.render,
}

export const Ordered: Story = {
  args: { ordered: true, bordered: true },
  render: Default.render,
}

export const InteractiveWithContent: Story = {
  args: { bordered: true },
  render: (args) => (
    <List {...args} style={{ maxWidth: '24rem' }}>
      <ListItem
        interactive
        startContent={<Avatar name="Amine Brahmi" size="sm" />}
        endContent={<Badge variant="success">Actif</Badge>}
      >
        Amine Brahmi
      </ListItem>
      <ListItem
        interactive
        startContent={<Avatar name="Sophie Martin" size="sm" />}
        endContent={<Badge variant="warning">En attente</Badge>}
      >
        Sophie Martin
      </ListItem>
    </List>
  ),
}
