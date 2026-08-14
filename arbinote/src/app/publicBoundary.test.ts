import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(target) : /\.(ts|tsx)$/.test(entry.name) ? [target] : []
  })
}

describe('ArbiNote public boundary', () => {
  it('does not contain admin pages or official-assessment API routes', () => {
    expect(existsSync(path.join(process.cwd(), 'src/app/admin'))).toBe(false)
    expect(existsSync(path.join(process.cwd(), 'src/app/api/admin'))).toBe(false)
    expect(existsSync(path.join(process.cwd(), 'src/app/api/officiel'))).toBe(false)
    expect(existsSync(path.join(process.cwd(), 'src/lib/auditLog.ts'))).toBe(false)
    expect(existsSync(path.join(process.cwd(), 'src/lib/ssoSession.ts'))).toBe(false)
  })

  it('never references confidential official-assessment fields from a public route', () => {
    const publicApiSources = sourceFiles(path.join(process.cwd(), 'src/app/api'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')
    expect(publicApiSources).not.toMatch(/private_comment|points_forts|points_faibles|recommandations|RefereeOfficialEvaluation/)
  })
})
