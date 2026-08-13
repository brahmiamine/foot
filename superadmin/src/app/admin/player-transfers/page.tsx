import AdminPlayerTransfersManager from '@/components/admin/AdminPlayerTransfersManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminPlayerTransfersPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminPlayerTransfersManager /> : <AdminLogin />
}
