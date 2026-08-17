import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { ButtonGroup } from './ButtonGroup'

const meta: Meta<typeof ButtonGroup> = {
  title: 'Actions/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
}

export default meta
type Story = StoryObj<typeof ButtonGroup>

export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="secondary">Jour</Button>
      <Button variant="secondary">Semaine</Button>
      <Button variant="secondary">Mois</Button>
    </ButtonGroup>
  ),
}

export const Attached: Story = {
  args: { attached: true },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="secondary">Jour</Button>
      <Button variant="secondary">Semaine</Button>
      <Button variant="secondary">Mois</Button>
    </ButtonGroup>
  ),
}

export const Vertical: Story = {
  args: { orientation: 'vertical', attached: true },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="secondary">Profil</Button>
      <Button variant="secondary">Licence</Button>
      <Button variant="secondary">Documents</Button>
    </ButtonGroup>
  ),
}
