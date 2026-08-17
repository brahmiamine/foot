import type { Meta, StoryObj } from '@storybook/react'
import { Stat } from './Stat'

const TrendUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
)

const meta: Meta<typeof Stat> = {
  title: 'Data Display/Stat',
  component: Stat,
  tags: ['autodocs'],
  argTypes: {
    trend: { control: 'select', options: ['up', 'down', 'neutral'] },
  },
  args: {
    label: 'Licenciés actifs',
    value: '1 240',
    delta: '+4.2%',
    trend: 'up',
  },
}

export default meta
type Story = StoryObj<typeof Stat>

export const Default: Story = {}

export const Trends: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Stat label="Licenciés actifs" value="1 240" delta="+4.2%" trend="up" />
      <Stat label="Arbitres disponibles" value="86" delta="-2.1%" trend="down" />
      <Stat label="Matchs planifiés" value="312" delta="0.0%" trend="neutral" />
    </div>
  ),
}

export const WithIcon: Story = {
  args: { icon: <TrendUpIcon /> },
}

export const WithoutDelta: Story = {
  args: { delta: undefined },
}
