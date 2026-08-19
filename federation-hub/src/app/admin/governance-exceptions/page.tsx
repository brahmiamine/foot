import AdminGovernanceExceptionsManager from '@/components/admin/AdminGovernanceExceptionsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminGovernanceExceptionsPage() {
  return await getCompetitionAdminPageSession()
    ? <AdminGovernanceExceptionsManager />
    : <AdminLogin />
}
