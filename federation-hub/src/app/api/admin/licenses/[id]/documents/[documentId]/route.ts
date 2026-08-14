import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { PersonLicenseAuthorizationError, reviewPersonLicenseDocument } from '@/lib/personLicensing'
import { PersonLicenseWorkflowError } from '../../../../../../../../../packages/regulatory-shared/src/personLicensing'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id, documentId } = await params
    const body = await request.json() as { status?: string; reviewComment?: string }
    if (body.status !== 'ACCEPTED' && body.status !== 'REJECTED') return NextResponse.json({ error: 'Statut de pièce invalide' }, { status: 400 })
    const document = await reviewPersonLicenseDocument(await getDataSource(), session, {
      userId: session.id,
      role: session.role,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
    }, id, documentId, body.status, body.reviewComment)
    return NextResponse.json(document)
  } catch (error) {
    if (error instanceof PersonLicenseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof PersonLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error reviewing person license document:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
