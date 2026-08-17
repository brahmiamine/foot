import type { Meta, StoryObj } from '@storybook/react'
import { Container } from './Container'
import { Text } from './Text'

const meta: Meta<typeof Container> = {
  title: 'Layout/Container',
  component: Container,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Container>

export const Default: Story = {
  render: () => (
    <div style={{ background: 'var(--foot-color-border)' }}>
      <Container>
        <div style={{ background: 'var(--foot-color-surface)', padding: '1rem' }}>
          <Text>
            Centered, gutter-safe max-width wrapper (`--foot-content-max`, `--foot-page-gutter`).
          </Text>
        </div>
      </Container>
    </div>
  ),
}
