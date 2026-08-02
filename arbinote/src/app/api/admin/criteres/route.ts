import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listCriteres, createCritere } from '@/lib/adminCriteres'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const criteres = await listCriteres()
    return NextResponse.json(criteres)
  } catch (error) {
    console.error('Error listing criteres:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const critere = await createCritere(body)
    await logAdminAction({ request, action: 'create', entityType: 'critere', entityId: critere.id })
    return NextResponse.json(critere, { status: 201 })
  } catch (error) {
    console.error('Error creating critere:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


