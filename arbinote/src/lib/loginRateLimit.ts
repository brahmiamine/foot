/**
 * Anti brute-force sur /api/admin/login : compteur en mémoire par IP.
 * Suffisant pour un déploiement mono-instance (pas besoin de Redis).
 * Seules les tentatives échouées sont comptabilisées.
 */

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

const failedAttemptsByIp = new Map<string, number[]>()

function pruneOldAttempts(ip: string): number[] {
  const now = Date.now()
  const attempts = (failedAttemptsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  failedAttemptsByIp.set(ip, attempts)
  return attempts
}

export function isLoginRateLimited(ip: string): boolean {
  if (ip === 'unknown') return false
  return pruneOldAttempts(ip).length >= MAX_ATTEMPTS
}

export function recordFailedLoginAttempt(ip: string): void {
  if (ip === 'unknown') return
  const attempts = pruneOldAttempts(ip)
  attempts.push(Date.now())
  failedAttemptsByIp.set(ip, attempts)
}

export function clearFailedLoginAttempts(ip: string): void {
  failedAttemptsByIp.delete(ip)
}
