import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from './Button'
import { Drawer } from './Drawer'
import type { DrawerProps } from './Drawer'
import { Checkbox } from './Checkbox'
import { Text } from './Text'

const meta: Meta<typeof Drawer> = {
  title: 'Overlay/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'select', options: ['start', 'end', 'bottom'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Focus-trapped, Escape-to-close, portal-rendered side/bottom panel. Stories wrap `Drawer` in a small stateful demo so it can be opened and closed in the canvas.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Drawer>

function DrawerDemo(props: Partial<DrawerProps> & { buttonLabel?: string }) {
  const { buttonLabel = 'Ouvrir les filtres', ...rest } = props
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Filtres" {...rest}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Checkbox label="Ligue 1" defaultChecked />
          <Checkbox label="Ligue 2" />
          <Checkbox label="National" />
          <Text tone="muted" size="sm">
            Appuyez sur Échap ou cliquez à l&apos;extérieur pour fermer.
          </Text>
        </div>
      </Drawer>
    </>
  )
}

export const End: Story = {
  render: () => <DrawerDemo placement="end" />,
}

export const Start: Story = {
  render: () => <DrawerDemo buttonLabel="Ouvrir (start)" placement="start" />,
}

export const Bottom: Story = {
  render: () => <DrawerDemo buttonLabel="Ouvrir (bottom)" placement="bottom" size="60vh" />,
}
