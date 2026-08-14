import AdminFinancialComplianceManager from '@/components/admin/AdminFinancialComplianceManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
export default async function AdminFinancialCompliancePage() { return await getCompetitionAdminPageSession() ? <AdminFinancialComplianceManager /> : <AdminLogin /> }
