import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

const SearchOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const meta: Meta<typeof EmptyState> = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    title: 'Aucun résultat',
    description: 'Essayez de modifier vos filtres de recherche.',
  },
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {}

export const WithIcon: Story = {
  args: { icon: <SearchOffIcon /> },
}

export const WithAction: Story = {
  args: {
    icon: <SearchOffIcon />,
    action: <Button onClick={() => {}}>Réinitialiser les filtres</Button>,
  },
}

export const TitleOnly: Story = {
  args: { description: undefined, action: undefined, icon: undefined },
}
