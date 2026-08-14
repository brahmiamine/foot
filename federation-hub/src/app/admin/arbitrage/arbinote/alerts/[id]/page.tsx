import AdminAlertDetails from '@/components/admin/AdminAlertDetails'
import AdminLogin from '@/components/admin/AdminLogin'
import { hasAdminSession } from '@/lib/adminAuth'

export default async function AdminAlertDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const authenticated = await hasAdminSession()
  if (!authenticated) {
    return <AdminLogin />
  }

  const { id } = await params
  return <AdminAlertDetails alertId={id} />
}

