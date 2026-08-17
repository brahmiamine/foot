import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SearchInput } from './SearchInput'

const meta: Meta<typeof SearchInput> = {
  title: 'Forms/SearchInput',
  component: SearchInput,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SearchInput>

function ControlledSearch() {
  const [value, setValue] = useState('')
  return (
    <div style={{ maxWidth: '20rem' }}>
      <SearchInput
        placeholder="Rechercher un club…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onClear={() => setValue('')}
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <ControlledSearch />,
}

export const WithValueAndClear: Story = {
  render: () => {
    function WithValue() {
      const [value, setValue] = useState('AS Monaco')
      return (
        <div style={{ maxWidth: '20rem' }}>
          <SearchInput
            placeholder="Rechercher un club…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onClear={() => setValue('')}
          />
        </div>
      )
    }
    return <WithValue />
  },
}

export const Disabled: Story = {
  render: () => (
    <div style={{ maxWidth: '20rem' }}>
      <SearchInput placeholder="Rechercher…" disabled />
    </div>
  ),
}
