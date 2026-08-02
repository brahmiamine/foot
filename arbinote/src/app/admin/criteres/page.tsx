import CritereManager from '@/components/admin/CritereManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminCriteresPage() {
  const authenticated = await hasAdminSession()
  if (!authenticated) {
    return <AdminLogin />
  }

  return <CritereManager />
}


