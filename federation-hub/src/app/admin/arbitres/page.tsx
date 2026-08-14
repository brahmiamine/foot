import AdminArbitresManager from '@/components/admin/AdminArbitresManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminArbitresPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminArbitresManager /> : <AdminLogin />
}

