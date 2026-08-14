import AdminStaffInvitationsManager from '@/components/admin/AdminStaffInvitationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getAdminPageSession } from '@/lib/adminAuth'

export default async function AdminStaffInvitationsPage() {
  const session = await getAdminPageSession()
  if (!session) return <AdminLogin />
  const isPlatform = session.role === 'SUPERADMIN' || session.role === 'PLATFORM_SUPERADMIN'
  return <AdminStaffInvitationsManager isPlatform={isPlatform} />
}
