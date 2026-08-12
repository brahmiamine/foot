import { vi } from 'vitest'

/**
 * better-sqlite3 (used by tests to run real SQL against a real, disposable
 * database — see testDataSource.ts) doesn't support the MySQL-only column
 * types 'timestamp' and 'enum' used by the production entities in
 * src/lib/entities. Rather than fork the entity definitions (which would
 * drift from the real schema), this patches the `Column` decorator so those
 * two types get swapped for their SQLite-safe equivalents ('datetime',
 * 'simple-enum') whenever entities are loaded inside the test runner. This
 * only affects the in-memory test database; production code never runs
 * through Vitest and is untouched.
 */
vi.mock('typeorm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('typeorm')>()

  const SQLITE_TYPE_OVERRIDES: Record<string, string> = {
    timestamp: 'datetime',
    enum: 'simple-enum',
    char: 'varchar',
    // better-sqlite3 only allows AUTOINCREMENT on a column declared exactly
    // "INTEGER PRIMARY KEY" ; 'bigint' (used by Sheet.id) doesn't qualify.
    bigint: 'int',
  }

  function withTypeOverride(decorator: (...args: unknown[]) => PropertyDecorator) {
    return ((options?: unknown, ...rest: unknown[]) => {
      if (options && typeof options === 'object' && 'type' in options) {
        const type = (options as { type?: unknown }).type
        if (typeof type === 'string' && SQLITE_TYPE_OVERRIDES[type]) {
          options = { ...options, type: SQLITE_TYPE_OVERRIDES[type] }
        }
      }
      return decorator(options, ...rest)
    }) as typeof actual.Column
  }

  return {
    ...actual,
    Column: withTypeOverride(actual.Column as (...args: unknown[]) => PropertyDecorator),
    PrimaryGeneratedColumn: withTypeOverride(actual.PrimaryGeneratedColumn as (...args: unknown[]) => PropertyDecorator),
  }
})
