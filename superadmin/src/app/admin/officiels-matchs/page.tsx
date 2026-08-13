import AdminFederationMatchOfficialsManager from '@/components/admin/AdminFederationMatchOfficialsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getAdminPageSession } from '@/lib/adminAuth'

export default async function AdminOfficielsMatchsPage() {
  const session = await getAdminPageSession()
  if (!session) return <AdminLogin />
  const isPlatform = session.role === 'SUPERADMIN' || session.role === 'PLATFORM_SUPERADMIN'
  return <AdminFederationMatchOfficialsManager isPlatform={isPlatform} ownFederationId={session.federationId ?? null} />
}
