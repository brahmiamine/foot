import styled, { keyframes } from 'styled-components'

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  className?: string
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`

const radiusFor = {
  text: 'var(--foot-radius-sm)',
  circular: '999px',
  rectangular: 'var(--foot-radius-md)',
}

const StyledSkeleton = styled.span<{
  $variant: 'text' | 'circular' | 'rectangular'
  $width?: string | number
  $height?: string | number
}>`
  display: block;
  width: ${(p) => (typeof p.$width === 'number' ? `${p.$width}px` : (p.$width ?? '100%'))};
  height: ${(p) =>
    typeof p.$height === 'number'
      ? `${p.$height}px`
      : (p.$height ?? (p.$variant === 'text' ? '1em' : '2.5rem'))};
  border-radius: ${(p) => radiusFor[p.$variant]};
  background: var(--foot-color-border);
  animation: ${pulse} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.7;
  }
`

export function Skeleton({ variant = 'text', width, height, className }: SkeletonProps) {
  return (
    <StyledSkeleton
      className={className}
      $variant={variant}
      $width={width}
      $height={height}
      aria-hidden="true"
    />
  )
}
