import AdminFederationAffiliationsManager from '@/components/admin/AdminFederationAffiliationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getAdminPageSession } from '@/lib/adminAuth'

export default async function AdminClubsAffiliesPage() {
  const session = await getAdminPageSession()
  if (!session) return <AdminLogin />
  const isPlatform = session.role === 'SUPERADMIN' || session.role === 'PLATFORM_SUPERADMIN'
  return <AdminFederationAffiliationsManager isPlatform={isPlatform} ownFederationId={session.federationId ?? null} />
}
