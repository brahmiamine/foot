import { ReactNode } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { FederationProvider } from '@/components/FederationContext'
import { AdminSidebarProvider } from '@/components/admin/AdminSidebarContext'
import { fetchFederationsWithLeagues } from '@/lib/dataAccess'
import { getActiveLeagueId } from '@/lib/leagueSelection'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const federations = await fetchFederationsWithLeagues()
  const availableLeagueIds = new Set(
    federations.flatMap((fed: any) => fed.leagues.map((league: any) => league.id))
  )

  let activeLeagueId = await getActiveLeagueId()
  if (!activeLeagueId || !availableLeagueIds.has(activeLeagueId)) {
    activeLeagueId = federations[0]?.leagues[0]?.id ?? null
  }

  if (!activeLeagueId) {
    return (
      <div className="min-h-screen bg-[#0b1f2e] text-white flex items-center justify-center px-6">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-2xl font-semibold">Configuration requise</h1>
          <p className="text-slate-200">
            Aucune ligue n&apos;est disponible. Ajoutez des fédérations et ligues dans la base de données
            pour utiliser l&apos;espace admin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <FederationProvider federations={federations} initialLeagueId={activeLeagueId}>
      <AdminSidebarProvider>
        <div className="min-h-screen bg-[#0b1f2e]">
          <div className="flex min-h-screen">
            <AdminSidebar />
            <div className="flex-1 bg-[#f4f6f8] text-gray-900 min-w-0">
              <AdminHeader />
              <div className="p-4 sm:p-6 lg:p-8">{children}</div>
            </div>
          </div>
        </div>
      </AdminSidebarProvider>
    </FederationProvider>
  )
}
