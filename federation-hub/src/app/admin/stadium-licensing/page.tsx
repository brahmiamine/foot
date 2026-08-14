import AdminStadiumInspectionsManager from '@/components/admin/AdminStadiumInspectionsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminStadiumInspectionsPage() { return await getCompetitionAdminPageSession() ? <AdminStadiumInspectionsManager /> : <AdminLogin /> }
