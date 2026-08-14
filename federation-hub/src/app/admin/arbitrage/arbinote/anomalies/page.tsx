import AdminAnomaliesManager from '@/components/admin/AdminAnomaliesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminAnomaliesPage() {
  const authenticated = await hasAdminSession()
  if (!authenticated) {
    return <AdminLogin />
  }
  return <AdminAnomaliesManager />
}

