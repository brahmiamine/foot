import { NextRequest } from 'next/server'
import { getAdminSession } from './adminAuth'

export function isPlatformPaymentRole(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'PLATFORM_SUPERADMIN'
}

export async function getPlatformPaymentAdminSession(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session || !isPlatformPaymentRole(session.role)) return null
  return session
}

export function getOperatorRequestContext(request: NextRequest, userId: string) {
  return {
    userId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent'),
  }
}
