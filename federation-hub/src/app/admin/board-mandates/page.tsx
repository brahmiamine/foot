import AdminBoardMandatesManager from '@/components/admin/AdminBoardMandatesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminBoardMandatesPage() { return await getCompetitionAdminPageSession() ? <AdminBoardMandatesManager /> : <AdminLogin /> }
