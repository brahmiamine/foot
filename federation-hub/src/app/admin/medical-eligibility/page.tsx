import AdminMedicalEligibilityManager from '@/components/admin/AdminMedicalEligibilityManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminMedicalEligibilityPage() { return await getCompetitionAdminPageSession() ? <AdminMedicalEligibilityManager /> : <AdminLogin /> }
