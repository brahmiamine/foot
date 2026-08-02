import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

/**
 * Protection IDOR sur les endpoints "mes votes" / "mes messages" :
 * device_fingerprint est une valeur générée côté client (FingerprintJS) et jamais
 * vérifiée par le serveur. N'importe qui connaissant/devinant l'empreinte d'un
 * visiteur peut lire son historique de votes ou ses messages de contact (email
 * inclus) via /api/votes/user/[fingerprint] et /api/contact/user.
 *
 * On délivre, au moment où un visiteur soumet effectivement un vote ou un
 * message (POST), un cookie httpOnly contenant HMAC(fingerprint, secret serveur).
 * Les endpoints de lecture n'acceptent la requête que si ce cookie correspond à
 * l'empreinte demandée : un attaquant qui connaît seulement la chaîne fingerprint
 * ne peut pas produire cette preuve sans le secret serveur, et ne peut pas lire le
 * cookie httpOnly d'un autre navigateur.
 */

const COOKIE_NAME = 'fp_proof'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 an

function getSecret(): string {
  const secret = process.env.FINGERPRINT_PROOF_SECRET
  if (!secret) {
    throw new Error('FINGERPRINT_PROOF_SECRET must be set in .env.local')
  }
  return secret
}

function computeProof(fingerprint: string): string {
  return createHmac('sha256', getSecret()).update(fingerprint).digest('hex')
}

/**
 * À appeler sur la réponse d'un POST de vote/message réussi, pour lier ce
 * navigateur à l'empreinte qu'il vient d'utiliser.
 */
export function issueFingerprintProofCookie(response: NextResponse, fingerprint: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: computeProof(fingerprint),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

/**
 * Vérifie que la requête porte bien la preuve correspondant à l'empreinte
 * demandée. Comparaison en temps constant pour éviter les attaques par timing.
 */
export function hasFingerprintProof(request: Request, fingerprint: string): boolean {
  if (!fingerprint) return false

  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`))
  if (!match) return false

  const provided = Buffer.from(decodeURIComponent(match[1]))
  const expected = Buffer.from(computeProof(fingerprint))

  if (provided.length !== expected.length) return false
  return timingSafeEqual(provided, expected)
}
