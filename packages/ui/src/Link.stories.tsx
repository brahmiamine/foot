import type { Meta, StoryObj } from '@storybook/react'
import { Link } from './Link'

const meta: Meta<typeof Link> = {
  title: 'Actions/Link',
  component: Link,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'muted', 'inherit'] },
    underline: { control: 'select', options: ['always', 'hover', 'none'] },
  },
  args: {
    children: 'Voir les clubs',
    href: '/clubs',
    variant: 'primary',
    underline: 'hover',
  },
}

export default meta
type Story = StoryObj<typeof Link>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Link {...args} variant="primary">
        Primary
      </Link>
      <Link {...args} variant="muted">
        Muted
      </Link>
      <span style={{ color: '#333' }}>
        <Link {...args} variant="inherit">
          Inherit
        </Link>
      </span>
    </div>
  ),
}

export const UnderlineStyles: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Link {...args} underline="always">
        Always
      </Link>
      <Link {...args} underline="hover">
        Hover
      </Link>
      <Link {...args} underline="none">
        None
      </Link>
    </div>
  ),
}

export const ExternalTarget: Story = {
  args: { href: 'https://example.com', target: '_blank', children: 'Ouvre un nouvel onglet' },
}
