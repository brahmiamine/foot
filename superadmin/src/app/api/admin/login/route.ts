import { NextRequest, NextResponse } from 'next/server'
import { issueAdminSession, validateCredentials } from '@/lib/adminAuth'
import { logAdminAction } from '@/lib/auditLog'
import { getClientIP } from '@/lib/utils'
import { clearFailedLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from '@/lib/loginRateLimit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)

    if (isLoginRateLimited(clientIP)) {
      return NextResponse.json(
        { error: 'Trop de tentatives échouées. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
    }

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Identifiants requis' }, { status: 400 })
    }

    if (!validateCredentials(username, password)) {
      recordFailedLoginAttempt(clientIP)
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    clearFailedLoginAttempts(clientIP)

    const response = NextResponse.json({ success: true })
    issueAdminSession(response, username)
    await logAdminAction({ request, action: 'login', entityType: 'admin_session', adminUsername: username })
    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
