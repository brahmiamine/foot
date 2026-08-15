import AdminSeasonCyclesManager from '@/components/admin/AdminSeasonCyclesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminSeasonCyclesPage() { return await getCompetitionAdminPageSession() ? <AdminSeasonCyclesManager /> : <AdminLogin /> }
