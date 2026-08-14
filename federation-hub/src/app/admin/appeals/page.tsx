import AdminAppealsManager from '@/components/admin/AdminAppealsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminAppealsPage() { return await getCompetitionAdminPageSession() ? <AdminAppealsManager /> : <AdminLogin /> }
