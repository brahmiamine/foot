import type { Meta, StoryObj } from '@storybook/react'
import type { ReactNode } from 'react'
import { Card } from './Card'
import { Stack } from './Stack'
import { Text } from './Text'

const Box = ({ children }: { children: ReactNode }) => (
  <Card padding="sm" style={{ minWidth: '4rem', textAlign: 'center' }}>
    <Text size="sm">{children}</Text>
  </Card>
)

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  tags: ['autodocs'],
  argTypes: {
    direction: { control: 'radio', options: ['row', 'column'] },
    gap: { control: 'select', options: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'space-between', 'space-around'] },
  },
  args: {
    direction: 'row',
    gap: 'md',
  },
}

export default meta
type Story = StoryObj<typeof Stack>

export const Row: Story = {
  render: (args) => (
    <Stack {...args}>
      <Box>1</Box>
      <Box>2</Box>
      <Box>3</Box>
    </Stack>
  ),
}

export const Column: Story = {
  args: { direction: 'column' },
  render: Row.render,
}

export const AlignCenter: Story = {
  args: { align: 'center' },
  render: (args) => (
    <Stack {...args} style={{ height: '6rem', background: 'var(--foot-color-border)' }}>
      <Box>1</Box>
      <Box>2</Box>
    </Stack>
  ),
}

export const JustifySpaceBetween: Story = {
  args: { justify: 'space-between' },
  render: (args) => (
    <Stack {...args} style={{ width: '100%', background: 'var(--foot-color-border)' }}>
      <Box>1</Box>
      <Box>2</Box>
      <Box>3</Box>
    </Stack>
  ),
}

export const Wrap: Story = {
  args: { wrap: true },
  render: (args) => (
    <Stack {...args} style={{ maxWidth: '12rem' }}>
      <Box>1</Box>
      <Box>2</Box>
      <Box>3</Box>
      <Box>4</Box>
      <Box>5</Box>
    </Stack>
  ),
}
