import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { getStaffContractBundle, StaffContractAuthorizationError } from '@/lib/staffContracts'
import { StaffContractWorkflowError } from '../../../../../../../packages/regulatory-shared/src/staffContract'
import { toPlain } from '@/lib/serialization'
export const runtime = 'nodejs'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const session = await getAdminSession(request); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); try { return NextResponse.json(toPlain(await getStaffContractBundle(await getDataSource(), session, (await params).id))) } catch (error) { if (error instanceof StaffContractAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 }); if (error instanceof StaffContractWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 }); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }) } }
