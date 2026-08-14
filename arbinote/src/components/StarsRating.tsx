'use client'

import { useState } from 'react'

interface StarsRatingProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function StarsRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: StarsRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const handleClick = (newValue: number) => {
    if (!readOnly && onChange) {
      onChange(newValue)
    }
  }

  const displayValue = hoverValue || value

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readOnly && setHoverValue(star)}
          onMouseLeave={() => !readOnly && setHoverValue(0)}
          disabled={readOnly}
          className={`${sizeClasses[size]} ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } transition-transform ${
            star <= displayValue
              ? 'text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
          aria-label={`Noter ${star} étoile${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

