import type { Meta, StoryObj } from '@storybook/react'
import { Breadcrumb } from './Breadcrumb'

const meta: Meta<typeof Breadcrumb> = {
  title: 'Navigation/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  args: {
    items: [
      { label: 'Accueil', href: '/' },
      { label: 'Clubs', href: '/clubs' },
      { label: 'AS Monaco' },
    ],
  },
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

export const Default: Story = {}

export const CustomSeparator: Story = {
  args: { separator: '›' },
}

export const WithClickHandlers: Story = {
  args: {
    items: [
      { label: 'Accueil', onClick: () => console.log('go home') },
      { label: 'Clubs', onClick: () => console.log('go clubs') },
      { label: 'AS Monaco' },
    ],
  },
}
