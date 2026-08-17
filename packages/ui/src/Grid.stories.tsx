import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './Card'
import { Grid } from './Grid'
import { Text } from './Text'

const Tile = ({ label }: { label: string }) => (
  <Card padding="md">
    <Text weight="bold">{label}</Text>
  </Card>
)

const meta: Meta<typeof Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  tags: ['autodocs'],
  argTypes: {
    gap: { control: 'select', options: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] },
  },
}

export default meta
type Story = StoryObj<typeof Grid>

export const FixedColumns: Story = {
  args: { columns: 3, gap: 'lg' },
  render: (args) => (
    <Grid {...args}>
      <Tile label="Colonne 1" />
      <Tile label="Colonne 2" />
      <Tile label="Colonne 3" />
      <Tile label="Colonne 4" />
      <Tile label="Colonne 5" />
      <Tile label="Colonne 6" />
    </Grid>
  ),
}

export const Fluid: Story = {
  args: { columns: 'fluid', minColumnWidth: '10rem', gap: 'md' },
  render: (args) => (
    <Grid {...args}>
      <Tile label="Auto-fit A" />
      <Tile label="Auto-fit B" />
      <Tile label="Auto-fit C" />
      <Tile label="Auto-fit D" />
    </Grid>
  ),
}
