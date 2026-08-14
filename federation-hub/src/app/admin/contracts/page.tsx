import AdminPlayerContractsManager from '@/components/admin/AdminPlayerContractsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminPlayerContractsPage() { const session = await getCompetitionAdminPageSession(); return session ? <AdminPlayerContractsManager /> : <AdminLogin /> }
