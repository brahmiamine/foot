import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listPlayersByClub } from '@/lib/adminPlayerTransfers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const clubs = await listPlayersByClub()
    return NextResponse.json(clubs)
  } catch (error) {
    console.error('Error listing players by club:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}
