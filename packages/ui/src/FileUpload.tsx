import { forwardRef, useId, useRef, useState } from 'react'
import type { DragEvent, InputHTMLAttributes } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface FileUploadProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  hint?: string
  onFilesSelected?: (files: FileList) => void
}

const DropZone = styled.label<{ $dragActive: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 0;
  max-width: 100%;
  min-height: 8rem;
  padding: 1.25rem;
  text-align: center;
  border: 1px dashed ${(p) => (p.$dragActive ? 'var(--foot-color-primary)' : 'var(--foot-color-border)')};
  border-radius: var(--foot-radius-md);
  background: ${(p) => (p.$dragActive ? 'rgba(var(--foot-color-primary-rgb), 0.06)' : 'var(--foot-color-surface)')};
  color: var(--foot-color-text);
  font-family: var(--foot-font-ui);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;

  &:has(input:focus-visible) {
    outline: 2px solid var(--foot-color-primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;
  }
`

const Label = styled.span`
  font-weight: 700;
  font-size: 0.875rem;
`

const Hint = styled.span`
  font-size: 0.75rem;
  color: var(--foot-color-text-muted);
`

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;

  ${focusRing}
`

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(function FileUpload(
  { label = 'Glissez un fichier ou cliquez pour parcourir', hint, onFilesSelected, id, ...rest },
  ref,
) {
  const [dragActive, setDragActive] = useState(false)
  const internalRef = useRef<HTMLInputElement | null>(null)
  const generatedId = useId()
  const inputId = id ?? generatedId

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragActive(false)
    if (event.dataTransfer.files.length > 0) {
      onFilesSelected?.(event.dataTransfer.files)
      if (internalRef.current) internalRef.current.files = event.dataTransfer.files
    }
  }

  return (
    <DropZone
      htmlFor={inputId}
      $dragActive={dragActive}
      onDragOver={(event) => {
        event.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <Label>{label}</Label>
      {hint && <Hint>{hint}</Hint>}
      <HiddenInput
        ref={(node) => {
          internalRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        id={inputId}
        type="file"
        onChange={(event) => {
          if (event.target.files) onFilesSelected?.(event.target.files)
        }}
        {...rest}
      />
    </DropZone>
  )
})
