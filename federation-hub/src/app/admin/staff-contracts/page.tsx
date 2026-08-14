import AdminStaffContractsManager from '@/components/admin/AdminStaffContractsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminStaffContractsPage() { return await getCompetitionAdminPageSession() ? <AdminStaffContractsManager /> : <AdminLogin /> }
