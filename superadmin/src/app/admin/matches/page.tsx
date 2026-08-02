import AdminMatchesManager from '@/components/admin/AdminMatchesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminMatchesPage() {
  const authenticated = await hasAdminSession()
  if (!authenticated) {
    return <AdminLogin />
  }
  return <AdminMatchesManager />
}


