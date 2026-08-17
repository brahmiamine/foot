import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { Tooltip } from './Tooltip'

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const meta: Meta<typeof Tooltip> = {
  title: 'Data Display/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
  },
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story: "Hover or focus the trigger to reveal the tooltip (150ms show delay, Escape/mouse-leave to hide).",
      },
    },
  },
  render: () => (
    <div style={{ padding: '3rem' }}>
      <Tooltip content="Plus d'informations">
        <IconButton aria-label="Aide" icon={<InfoIcon />} />
      </Tooltip>
    </div>
  ),
}

export const Placements: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, auto)',
        gap: '3rem',
        padding: '3rem',
      }}
    >
      <Tooltip content="Placement top" placement="top">
        <Button variant="secondary">Top</Button>
      </Tooltip>
      <Tooltip content="Placement bottom" placement="bottom">
        <Button variant="secondary">Bottom</Button>
      </Tooltip>
      <Tooltip content="Placement left" placement="left">
        <Button variant="secondary">Left</Button>
      </Tooltip>
      <Tooltip content="Placement right" placement="right">
        <Button variant="secondary">Right</Button>
      </Tooltip>
    </div>
  ),
}
