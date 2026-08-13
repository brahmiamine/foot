import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listTransferHistory } from '@/lib/adminPlayerTransfers'

export const runtime = 'nodejs'

// GET /api/admin/players/transfers?playerId=...&teamId=... — historique des
// transferts, filtrable par joueur ou par club (émetteur ou destinataire).
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId') ?? undefined
    const teamId = searchParams.get('teamId') ?? undefined

    const history = await listTransferHistory({ playerId, teamId })
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error listing transfer history:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
