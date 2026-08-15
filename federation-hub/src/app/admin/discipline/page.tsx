import AdminDisciplineManager from '@/components/admin/AdminDisciplineManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminDisciplinePage() { return await getCompetitionAdminPageSession() ? <AdminDisciplineManager /> : <AdminLogin /> }
