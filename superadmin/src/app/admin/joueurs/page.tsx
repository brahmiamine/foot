import AdminPlayersManager from '@/components/admin/AdminPlayersManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getAdminPageSession } from '@/lib/adminAuth'

export default async function AdminPlayersPage() {
  const session = await getAdminPageSession()
  if (!session) return <AdminLogin />
  const isPlatform = session.role === 'SUPERADMIN' || session.role === 'PLATFORM_SUPERADMIN'
  return <AdminPlayersManager isPlatform={isPlatform} />
}
