import OfficielEvaluationsManager from '@/components/admin/OfficielEvaluationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getOfficialEvalPageSession } from '@/lib/adminAuth'
import { fetchCritereDefinitions } from '@/lib/dataAccess'

export default async function AdminOfficielPage() {
  const session = await getOfficialEvalPageSession()
  if (!session) {
    return <AdminLogin />
  }

  const criteres = (await fetchCritereDefinitions()).filter((c) => c.categorie === 'arbitre')

  return (
    <OfficielEvaluationsManager
      currentUser={{
        id: session.id,
        name: session.name,
        role: session.role as 'PLATFORM_SUPERADMIN' | 'SUPERADMIN' | 'FEDERATION_ADMIN' | 'REFEREE_OBSERVER',
        federationId: session.federationId ?? null,
      }}
      criteres={criteres.map((c) => ({ id: c.id, label: c.label_fr }))}
    />
  )
}
