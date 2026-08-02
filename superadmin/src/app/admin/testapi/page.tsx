import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'
import TestApiPanel from '@/components/admin/TestApiPanel'

export default async function TestApiPage() {
  const authenticated = await hasAdminSession()

  if (!authenticated) {
    return <AdminLogin />
  }

  return <TestApiPanel />
}
