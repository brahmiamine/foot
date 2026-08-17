import { useState } from 'react'
import styled from 'styled-components'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: AvatarSize
  className?: string
}

const dimensions: Record<AvatarSize, string> = {
  sm: '1.75rem',
  md: '2.5rem',
  lg: '3.25rem',
  xl: '4.5rem',
}

const fontSizes: Record<AvatarSize, string> = {
  sm: '0.7rem',
  md: '0.9rem',
  lg: '1.15rem',
  xl: '1.6rem',
}

const Circle = styled.span<{ $size: AvatarSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(p) => dimensions[p.$size]};
  height: ${(p) => dimensions[p.$size]};
  border-radius: 999px;
  overflow: hidden;
  background: var(--foot-color-border);
  color: var(--foot-color-text);
  font-family: var(--foot-font-ui);
  font-weight: 700;
  font-size: ${(p) => fontSizes[p.$size]};
  user-select: none;
`

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

function getInitials(name?: string) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '')
  return initials.join('')
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const [errored, setErrored] = useState(false)
  const showImage = src && !errored

  return (
    <Circle $size={size} className={className} role={showImage ? undefined : 'img'} aria-label={showImage ? undefined : (alt ?? name)}>
      {showImage ? (
        <Img src={src} alt={alt ?? name ?? ''} onError={() => setErrored(true)} />
      ) : (
        <span aria-hidden="true">{getInitials(name) || '?'}</span>
      )}
    </Circle>
  )
}
