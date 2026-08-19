import AdminEffectiveConfigurationManager from '@/components/admin/AdminEffectiveConfigurationManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminEffectiveConfigurationPage() {
  return await getCompetitionAdminPageSession() ? <AdminEffectiveConfigurationManager /> : <AdminLogin />
}
