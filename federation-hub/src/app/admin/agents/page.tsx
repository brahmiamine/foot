import AdminAgentsManager from '@/components/admin/AdminAgentsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminAgentsPage() { return await getCompetitionAdminPageSession() ? <AdminAgentsManager /> : <AdminLogin /> }
