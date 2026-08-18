import AdminRegulatoryPolicyCenterManager from '@/components/admin/AdminRegulatoryPolicyCenterManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminRegulatoryPolicyCenterPage() {
  return await getCompetitionAdminPageSession() ? <AdminRegulatoryPolicyCenterManager /> : <AdminLogin />
}
