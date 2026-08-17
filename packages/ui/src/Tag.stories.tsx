import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Tag } from './Tag'

const meta: Meta<typeof Tag> = {
  title: 'Data Display/Tag',
  component: Tag,
  tags: ['autodocs'],
  args: {
    children: 'U15',
  },
}

export default meta
type Story = StoryObj<typeof Tag>

export const Default: Story = {}

export const Removable: Story = {
  args: { onRemove: () => {} },
}

export const Disabled: Story = {
  args: { onRemove: () => {}, disabled: true },
}

function RemovableTagList() {
  const [tags, setTags] = useState(['U13', 'U15', 'U17', 'Seniors'])
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {tags.map((tag) => (
        <Tag key={tag} onRemove={() => setTags((current) => current.filter((t) => t !== tag))}>
          {tag}
        </Tag>
      ))}
    </div>
  )
}

export const InteractiveList: Story = {
  render: () => <RemovableTagList />,
}
