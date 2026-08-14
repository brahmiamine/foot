import AdminPersonLicensesManager from '@/components/admin/AdminPersonLicensesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminPersonLicensesPage() {
  const session = await getCompetitionAdminPageSession()
  return session ? <AdminPersonLicensesManager /> : <AdminLogin />
}
