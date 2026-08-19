import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/db'
import { processRegulatorySlaAlerts } from '@/lib/regulatorySla'

export const runtime = 'nodejs'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('x-cron-secret') === secret
}

/**
 * GOV-008 — surface d'ordonnancement externe. Le scheduler appelle une fois
 * par fédération ; la table regulatory_sla_alert_events rend l'opération
 * idempotente même si deux exécutions se chevauchent.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const federationId = new URL(request.url).searchParams.get('federationId')
  if (!federationId) {
    return NextResponse.json({ error: 'federationId requis' }, { status: 400 })
  }
  try {
    const dataSource = await getDataSource()
    const result = await processRegulatorySlaAlerts(dataSource, federationId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Unexpected regulatory SLA cron error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
