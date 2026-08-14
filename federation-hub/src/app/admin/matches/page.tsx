import AdminMatchesManager from '@/components/admin/AdminMatchesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminMatchesPage() {
  const session = await getCompetitionAdminPageSession()
  if (!session) {
    return <AdminLogin />
  }
  return <AdminMatchesManager />
}


