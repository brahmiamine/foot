import AdminPlayerTransfersManager from '@/components/admin/AdminPlayerTransfersManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminPlayerTransfersPage() {
  const session = await getCompetitionAdminPageSession()
  return session ? <AdminPlayerTransfersManager /> : <AdminLogin />
}
