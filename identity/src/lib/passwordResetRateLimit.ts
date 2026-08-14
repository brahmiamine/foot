/**
 * Anti-abus sur /api/forgot-password : compteur en mémoire par IP, même
 * pattern que src/lib/loginRateLimit.ts. Compte TOUTES les tentatives (pas
 * seulement celles correspondant à un compte existant) — sans ça, un
 * attaquant pourrait toujours utiliser l'endpoint comme oracle
 * d'énumération d'emails en observant qu'il n'est jamais limité tant que
 * l'email n'existe pas.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const attemptsByIp = new Map<string, number[]>();

function pruneOldAttempts(ip: string): number[] {
  const now = Date.now();
  const attempts = (attemptsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  attemptsByIp.set(ip, attempts);
  return attempts;
}

export function isPasswordResetRateLimited(ip: string): boolean {
  if (ip === "unknown") return false;
  return pruneOldAttempts(ip).length >= MAX_ATTEMPTS;
}

export function recordPasswordResetAttempt(ip: string): void {
  if (ip === "unknown") return;
  const attempts = pruneOldAttempts(ip);
  attempts.push(Date.now());
  attemptsByIp.set(ip, attempts);
}
