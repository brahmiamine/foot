import AdminClubUsersManager from '@/components/admin/AdminClubUsersManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminClubUsersPage({ params }: { params: Promise<{ teamId: string }> }) {
  const authenticated = await hasAdminSession()
  if (!authenticated) return <AdminLogin />

  const { teamId } = await params
  return <AdminClubUsersManager teamId={teamId} />
}
