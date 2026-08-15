import AdminClubSanctionsManager from '@/components/admin/AdminClubSanctionsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminClubSanctionsPage() { return await getCompetitionAdminPageSession() ? <AdminClubSanctionsManager /> : <AdminLogin /> }
