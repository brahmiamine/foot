import AdminStaffInvitationsManager from '@/components/admin/AdminStaffInvitationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminStaffInvitationsPage() {
  const authenticated = await hasAdminSession()
  return authenticated ? <AdminStaffInvitationsManager /> : <AdminLogin />
}
