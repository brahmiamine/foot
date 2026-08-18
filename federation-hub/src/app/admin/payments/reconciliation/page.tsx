import AdminLogin from '@/components/admin/AdminLogin'
import AdminPaymentReconciliationManager from '@/components/admin/AdminPaymentReconciliationManager'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminPaymentReconciliationPage() {
  return (await hasAdminSession()) ? <AdminPaymentReconciliationManager /> : <AdminLogin />
}
