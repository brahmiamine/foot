import AdminArbitresManager from '@/components/admin/AdminArbitresManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getAdminPageSession } from '@/lib/adminAuth'

export default async function AdminArbitresPage() {
  const session = await getAdminPageSession()
  return session ? <AdminArbitresManager /> : <AdminLogin />
}
