import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'
import { Card } from './Card'
import { Heading } from './Heading'
import { Text } from './Text'

const meta: Meta<typeof Card> = {
  title: 'Data Display/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
  },
  args: {
    padding: 'md',
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: '20rem' }}>
      <Heading as="h3" size="sm">
        AS Monaco
      </Heading>
      <Text tone="muted" size="sm">
        Ligue 1 — 18 500 licenciés
      </Text>
    </Card>
  ),
}

export const Interactive: Story = {
  args: { interactive: true },
  render: (args) => (
    <Card {...args} style={{ maxWidth: '20rem' }}>
      <Heading as="h3" size="sm">
        Cliquable / focusable
      </Heading>
      <Text tone="muted" size="sm">
        Survolez ou appuyez sur Tab pour voir l&apos;état hover/focus.
      </Text>
    </Card>
  ),
}

export const PaddingOptions: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {(['none', 'sm', 'md', 'lg'] as const).map((padding) => (
        <Card key={padding} padding={padding} style={{ width: '10rem' }}>
          <Text size="sm">padding=&quot;{padding}&quot;</Text>
        </Card>
      ))}
    </div>
  ),
}

export const WithBadge: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: '22rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Heading as="h3" size="sm">
            Club Sportif Sfaxien
          </Heading>
          <Text tone="muted" size="sm">
            Ligue Régionale — Sfax
          </Text>
        </div>
        <Badge variant="success">Actif</Badge>
      </div>
    </Card>
  ),
}
