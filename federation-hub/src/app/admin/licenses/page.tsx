import AdminPersonLicensesWithCards from '@/components/admin/AdminPersonLicensesWithCards'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminPersonLicensesPage() {
  const session = await getCompetitionAdminPageSession()
  return session ? <AdminPersonLicensesWithCards /> : <AdminLogin />
}
