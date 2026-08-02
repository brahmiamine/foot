import AdminFederationsManager from '@/components/admin/AdminFederationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminFederationsPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminFederationsManager /> : <AdminLogin />
}

