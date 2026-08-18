import AdminLogin from '@/components/admin/AdminLogin'
import AdminRefundManualReviewManager from '@/components/admin/AdminRefundManualReviewManager'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminRefundManualReviewPage() {
  return (await hasAdminSession()) ? <AdminRefundManualReviewManager /> : <AdminLogin />
}
