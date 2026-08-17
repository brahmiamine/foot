import type { Meta, StoryObj } from '@storybook/react'
import { FileUpload } from './FileUpload'

const meta: Meta<typeof FileUpload> = {
  title: 'Forms/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof FileUpload>

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: '24rem' }}>
      <FileUpload />
    </div>
  ),
}

export const WithHint: Story = {
  render: () => (
    <div style={{ maxWidth: '24rem' }}>
      <FileUpload
        label="Glissez votre licence ou cliquez pour parcourir"
        hint="PDF ou JPG, 5 Mo maximum"
      />
    </div>
  ),
}

export const MultipleFiles: Story = {
  render: () => (
    <div style={{ maxWidth: '24rem' }}>
      <FileUpload
        label="Ajouter des justificatifs"
        hint="Plusieurs fichiers acceptés"
        multiple
        onFilesSelected={(files) => console.log('files selected', files)}
      />
    </div>
  ),
}
