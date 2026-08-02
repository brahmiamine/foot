import AdminVotesManager from '@/components/admin/AdminVotesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminVotesPage() {
  const authenticated = await hasAdminSession()
  if (!authenticated) {
    return <AdminLogin />
  }
  return <AdminVotesManager />
}

