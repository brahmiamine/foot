import AdminPlayerRegistrationsManager from '@/components/admin/AdminPlayerRegistrationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminPlayerRegistrationsPage() {
  const session = await getCompetitionAdminPageSession()
  return session ? <AdminPlayerRegistrationsManager /> : <AdminLogin />
}
