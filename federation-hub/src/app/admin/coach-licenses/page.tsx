import AdminCoachQualificationsManager from '@/components/admin/AdminCoachQualificationsManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminCoachQualificationsPage() { return await getCompetitionAdminPageSession() ? <AdminCoachQualificationsManager /> : <AdminLogin /> }
