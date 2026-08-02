import { NextRequest, NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/adminAuth'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  clearAdminSession(response)
  await logAdminAction({ request, action: 'logout', entityType: 'admin_session' })
  return response
}


