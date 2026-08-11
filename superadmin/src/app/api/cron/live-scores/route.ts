import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { syncLiveScores } from '@/lib/liveScoreSync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Point d'entrée du job de synchro live API-Football, destiné à être
 * déclenché par un cron EXTERNE (cron système, cron du PaaS de déploiement,
 * GitHub Actions planifié...) — ce dépôt ne fait tourner aucun process Node
 * planificateur (aucune app Next.js du dépôt n'a ce besoin aujourd'hui, voir
 * avancement.md § "Infra cible non branchée" pour le même choix côté
 * monitoring/alerting : hors périmètre code, à provisionner au déploiement).
 * `GET` et `POST` sont tous les deux acceptés pour rester compatible avec la
 * plupart des services de cron externes (certains n'émettent que du GET).
 *
 * Hors de /api/admin/* : cette route n'est pas censée être appelée avec une
 * session SUPERADMIN (un cron n'en a pas) — le middleware global qui protège
 * /api/admin/* ne s'applique donc pas ici, remplacé par le secret partagé
 * ci-dessous.
 *
 * Volontairement PAS dans /api/admin/api-football/ : mélanger un point
 * d'entrée "job planifié, secret partagé" avec les routes "session
 * SUPERADMIN interactive" du reste de l'admin aurait rendu les deux modes
 * d'auth ambigus sur un même préfixe.
 */
function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.LIVE_SCORE_SYNC_SECRET
  if (!secret) return false

  const headerSecret = request.headers.get('x-cron-secret')
  if (headerSecret === secret) return true

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  return false
}

async function handle(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    // Comportement sûr par défaut : sans LIVE_SCORE_SYNC_SECRET configuré
    // (ou secret incorrect), la route refuse tout — jamais de synchro
    // déclenchable par n'importe qui, jamais de crash non plus.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Défensif, même logique que WebPushProvider.onModuleInit
  // (notification-api) : une config externe absente rend la fonctionnalité
  // inactive, elle ne fait jamais planter la route. Vérifié ICI (avant
  // d'ouvrir une connexion DB) pour que l'absence de clé n'ait strictement
  // aucun effet de bord, y compris en lecture.
  if (!process.env.API_FOOTBALL_KEY) {
    console.warn('[live-scores-sync] API_FOOTBALL_KEY absent : synchro inactive (no-op).')
    return NextResponse.json({ status: 'inactive', reason: 'API_FOOTBALL_KEY manquant' })
  }

  try {
    const result = await syncLiveScores()
    return NextResponse.json({ status: 'ok', ...result })
  } catch (error) {
    console.error('[live-scores-sync] échec de la synchro live', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
