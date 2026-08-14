import AdminPlayerTransfersManager from '@/components/admin/AdminPlayerTransfersManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getAdminPageSession } from '@/lib/adminAuth'

export default async function AdminPlayerTransfersPage() {
  const session = await getAdminPageSession()
  return session ? <AdminPlayerTransfersManager /> : <AdminLogin />
}
