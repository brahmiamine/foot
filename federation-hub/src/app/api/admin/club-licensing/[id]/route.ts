import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getClubLicenseBundle, ClubLicenseAuthorizationError } from '@/lib/clubLicensing'
import { ClubLicenseWorkflowError } from '../../../../../../../packages/regulatory-shared/src/clubLicensing'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    return NextResponse.json(toPlain(await getClubLicenseBundle(await getDataSource(), session, id)))
  } catch (error) {
    if (error instanceof ClubLicenseAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof ClubLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 })
    console.error('Error loading club licence application:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
