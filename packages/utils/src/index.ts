export type ClassValue = string | false | null | undefined

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${String(value)}`)
}
