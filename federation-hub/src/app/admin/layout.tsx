import { ReactNode } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { FederationProvider } from '@/components/FederationContext'
import { AdminSidebarProvider } from '@/components/admin/AdminSidebarContext'
import { fetchFederationsWithLeagues } from '@/lib/dataAccess/federations'
import { getActiveLeagueId } from '@/lib/leagueSelection'

interface LeagueWithId {
  id: number
}

interface FederationWithLeagues {
  leagues: LeagueWithId[]
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const federations = await fetchFederationsWithLeagues()
  const availableLeagueIds = new Set(
    federations.flatMap((fed: FederationWithLeagues) => fed.leagues.map((league: LeagueWithId) => league.id))
  )

  let activeLeagueId = await getActiveLeagueId()
  if (!activeLeagueId || !availableLeagueIds.has(activeLeagueId)) {
    activeLeagueId = federations[0]?.leagues[0]?.id ?? null
  }

  if (!activeLeagueId) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 bg-body-tertiary">
        <div className="card shadow-sm border-0" style={{ maxWidth: '680px' }}>
          <div className="card-body p-4 p-md-5 text-center">
            <h1 className="h3 mb-3">Configuration requise</h1>
            <p className="text-muted mb-0">
            Aucune ligue n&apos;est disponible. Ajoutez des fédérations et ligues dans la base de données
            pour utiliser l&apos;espace admin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FederationProvider federations={federations} initialLeagueId={activeLeagueId}>
      <AdminSidebarProvider>
        <div id="layout-wrapper">
          <AdminHeader />
            <AdminSidebar />
            <div className="main-content">
              <div className="page-content">
                <div className="container-fluid">{children}</div>
              </div>
            </div>
        </div>
      </AdminSidebarProvider>
    </FederationProvider>
  )
}
