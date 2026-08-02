import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

const ADMIN_COOKIE = 'admin-token'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 4 // 4h

function getEnvCredentials() {
  const username = process.env.ADMIN_USER
  const password = process.env.ADMIN_PASS

  if (!username || !password) {
    throw new Error('ADMIN_USER and ADMIN_PASS must be set in .env.local')
  }

  return { username, password }
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET must be set in .env.local')
  }
  return secret
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Cookie de session : un token signé (username + expiration + signature HMAC),
 * jamais le mot de passe. Contrairement à un simple base64(username:password),
 * une fuite de ce cookie ne révèle pas les identifiants, et le token expire de
 * lui-même (l'expiration est vérifiée côté serveur, pas seulement laissée au
 * navigateur via maxAge).
 */
function signSessionPayload(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('hex')
}

function issueSessionToken(username: string): string {
  const expiresAt = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000
  const payload = `${username}:${expiresAt}`
  const signature = signSessionPayload(payload)
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

function isValidSessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [username, expiresAtStr, signature] = parts

    const expiresAt = Number(expiresAtStr)
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false

    const { username: expectedUsername } = getEnvCredentials()
    if (username !== expectedUsername) return false

    const expectedSignature = signSessionPayload(`${username}:${expiresAtStr}`)
    return timingSafeStringEqual(signature, expectedSignature)
  } catch {
    return false
  }
}

/**
 * En-tête Authorization: Basic (usage scripts/API directe) : les identifiants
 * réels sont comparés à chaque requête, comme le veut le standard HTTP Basic.
 * Différent du cookie de session : pas de risque de "session longue durée qui
 * contient le mot de passe" puisqu'il n'y a pas de session ici.
 */
function isValidBasicCredentials(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [username, password] = decoded.split(':')
    if (!username || !password) return false

    const expected = getEnvCredentials()
    return (
      timingSafeStringEqual(username, expected.username) &&
      timingSafeStringEqual(password, expected.password)
    )
  } catch {
    return false
  }
}

function isRequestAuthorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Basic ')) {
    return isValidBasicCredentials(header.slice(6))
  }

  const cookieToken = request.cookies.get(ADMIN_COOKIE)?.value
  if (cookieToken) {
    return isValidSessionToken(cookieToken)
  }

  return false
}

export function ensureAdminAuth(request: NextRequest) {
  if (isRequestAuthorized(request)) {
    return null
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function issueAdminSession(response: NextResponse, username: string) {
  const token = issueSessionToken(username)
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
  return response
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
  })
  return response
}

export async function hasAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value ?? null
  return token ? isValidSessionToken(token) : false
}

export function validateCredentials(username: string, password: string) {
  const expected = getEnvCredentials()
  return (
    timingSafeStringEqual(username, expected.username) &&
    timingSafeStringEqual(password, expected.password)
  )
}
