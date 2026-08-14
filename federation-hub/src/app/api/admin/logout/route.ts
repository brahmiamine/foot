import { NextRequest, NextResponse } from 'next/server'
import { clearSsoCookie } from '@/lib/ssoSession'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  clearSsoCookie(response)
  await logAdminAction({ request, action: 'logout', entityType: 'admin_session' })
  return response
}
