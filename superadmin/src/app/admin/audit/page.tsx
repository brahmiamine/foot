import AdminAuditManager from '@/components/admin/AdminAuditManager'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminAuditPage() {
  const authenticated = await hasAdminSession()
  if (!authenticated) {
    return <AdminLogin />
  }
  return <AdminAuditManager />
}
