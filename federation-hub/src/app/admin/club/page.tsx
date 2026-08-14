import AdminClubManager from '@/components/admin/AdminClubManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminClubPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminClubManager /> : <AdminLogin />
}
