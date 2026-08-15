import AdminLegalCasesManager from '@/components/admin/AdminLegalCasesManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminLegalCasesPage() { return await getCompetitionAdminPageSession() ? <AdminLegalCasesManager /> : <AdminLogin /> }
