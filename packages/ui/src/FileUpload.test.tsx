import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from './FileUpload'

describe('FileUpload', () => {
  it('renders a label and hint', () => {
    render(<FileUpload label="Déposez votre CV" hint="PDF uniquement" />)
    expect(screen.getByText('Déposez votre CV')).toBeInTheDocument()
    expect(screen.getByText('PDF uniquement')).toBeInTheDocument()
  })

  it('calls onFilesSelected when a file is chosen', async () => {
    const user = userEvent.setup()
    const onFilesSelected = vi.fn()
    render(<FileUpload label="Fichier" onFilesSelected={onFilesSelected} />)
    const file = new File(['contenu'], 'cv.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    expect(onFilesSelected).toHaveBeenCalledTimes(1)
    expect(input.files?.[0].name).toBe('cv.pdf')
  })
})
