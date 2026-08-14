import AdminTeamsManager from '@/components/admin/AdminTeamsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminTeamsPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminTeamsManager /> : <AdminLogin />
}

