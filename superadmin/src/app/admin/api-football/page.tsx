import AdminApiFootballMapping from '@/components/admin/AdminApiFootballMapping'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminApiFootballPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminApiFootballMapping /> : <AdminLogin />
}
