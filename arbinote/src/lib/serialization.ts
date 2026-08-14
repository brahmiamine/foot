export function toPlain<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }
  return JSON.parse(JSON.stringify(value))
}

export function toPlainArray<T>(values: T[] | null | undefined): T[] {
  if (!values || values.length === 0) {
    return []
  }
  return values.map((value) => toPlain(value))
}


