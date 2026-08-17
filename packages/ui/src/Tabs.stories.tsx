import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Tabs } from './Tabs'
import type { TabItem } from './Tabs'
import { Text } from './Text'

const items: TabItem[] = [
  { value: 'apercu', label: 'Aperçu', panel: <Text>Vue d&apos;ensemble du club et de ses effectifs.</Text> },
  { value: 'membres', label: 'Membres', panel: <Text>Liste des licenciés actifs et de leurs statuts.</Text> },
  { value: 'documents', label: 'Documents', panel: <Text>Statuts, PV d&apos;assemblée et justificatifs.</Text> },
  { value: 'archive', label: 'Archivé', panel: <Text>Section désactivée.</Text>, disabled: true },
]

const meta: Meta<typeof Tabs> = {
  title: 'Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Roving-tabindex tablist. Use ArrowLeft/ArrowRight/Home/End to move focus once a tab is focused.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Tabs>

export const Uncontrolled: Story = {
  render: () => <Tabs items={items} defaultValue="membres" />,
}

function ControlledTabs() {
  const [value, setValue] = useState('apercu')
  return (
    <div>
      <Text size="sm" tone="muted">
        Onglet actif : {value}
      </Text>
      <Tabs items={items} value={value} onChange={setValue} />
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledTabs />,
}
