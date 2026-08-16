import AdminFederalOperationsManager from '@/components/admin/AdminFederalOperationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminFederalOperationsPage() {
  return await getCompetitionAdminPageSession() ? <AdminFederalOperationsManager /> : <AdminLogin />
}
