import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import type { ModalProps } from './Modal'
import { Text } from './Text'

const meta: Meta<typeof Modal> = {
  title: 'Overlay/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Focus-trapped, Escape-to-close, portal-rendered dialog. Every story below wraps `Modal` in a small stateful demo so it can actually be opened and closed in the canvas.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

function ModalDemo(props: Partial<ModalProps> & { buttonLabel?: string }) {
  const { buttonLabel = 'Ouvrir la fenêtre', ...rest } = props
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirmer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => setOpen(false)}>Confirmer</Button>
          </>
        }
        {...rest}
      >
        <Text>Voulez-vous vraiment archiver ce club ? Cette action est réversible.</Text>
      </Modal>
    </>
  )
}

export const Interactive: Story = {
  render: () => <ModalDemo />,
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <ModalDemo buttonLabel="Small" size="sm" />
      <ModalDemo buttonLabel="Medium" size="md" />
      <ModalDemo buttonLabel="Large" size="lg" />
    </div>
  ),
}

export const WithoutOverlayClose: Story = {
  render: () => <ModalDemo buttonLabel="Ne ferme pas au clic extérieur" closeOnOverlayClick={false} />,
}

export const WithoutFooter: Story = {
  render: () => {
    function NoFooterDemo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Ouvrir (sans footer)</Button>
          <Modal open={open} onClose={() => setOpen(false)} title="Informations">
            <Text>Ce modal n&apos;a pas de zone d&apos;actions dédiée.</Text>
          </Modal>
        </>
      )
    }
    return <NoFooterDemo />
  },
}
