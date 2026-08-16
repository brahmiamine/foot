import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid = false, className = '', ...props }: InputProps) {
  const classes = ['foot-input', invalid ? 'foot-input--invalid' : '', className]
    .filter(Boolean)
    .join(' ')

  return <input className={classes} aria-invalid={invalid || undefined} {...props} />
}
