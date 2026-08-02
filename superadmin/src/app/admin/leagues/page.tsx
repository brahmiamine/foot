import AdminLeaguesManager from '@/components/admin/AdminLeaguesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminLeaguesPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminLeaguesManager /> : <AdminLogin />
}

