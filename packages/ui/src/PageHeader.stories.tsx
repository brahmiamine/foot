import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { PageHeader } from './PageHeader'

const meta: Meta<typeof PageHeader> = {
  title: 'Navigation/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    title: 'Tableau de bord',
  },
}

export default meta
type Story = StoryObj<typeof PageHeader>

export const Default: Story = {}

export const WithDescription: Story = {
  args: {
    description: 'Vue d\'ensemble des licenciés, des clubs et des championnats en cours.',
  },
}

export const WithActions: Story = {
  args: {
    description: 'Gérez les clubs affiliés à la fédération.',
    actions: (
      <>
        <Button variant="secondary">Exporter</Button>
        <Button>Nouveau club</Button>
      </>
    ),
  },
}
