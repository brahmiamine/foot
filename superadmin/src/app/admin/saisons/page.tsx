import AdminSaisonsManager from '@/components/admin/AdminSaisonsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminSaisonsPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminSaisonsManager /> : <AdminLogin />
}

