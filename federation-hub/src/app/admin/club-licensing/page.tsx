import AdminClubLicensingManager from '@/components/admin/AdminClubLicensingManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'

export default async function AdminClubLicensingPage() {
  const session = await getCompetitionAdminPageSession()
  return session ? <AdminClubLicensingManager /> : <AdminLogin />
}
