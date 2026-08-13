import AdminPlayersManager from '@/components/admin/AdminPlayersManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminPlayersPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminPlayersManager /> : <AdminLogin />
}
