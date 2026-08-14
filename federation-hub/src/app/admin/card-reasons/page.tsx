import { redirect } from 'next/navigation'
import { hasAdminSession } from '@/lib/adminAuth'
import AdminCardReasonsManager from '@/components/admin/AdminCardReasonsManager'

export default async function CardReasonsPage() {
  const authenticated = await hasAdminSession()

  if (!authenticated) {
    redirect('/login')
  }

  return <AdminCardReasonsManager />
}
