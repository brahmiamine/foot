import AdminAlertsManager from '@/components/admin/AdminAlertsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminAlertsPage() {
  const authenticated = await hasAdminSession()
  if (!authenticated) {
    return <AdminLogin />
  }
  return <AdminAlertsManager />
}

