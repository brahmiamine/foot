import { ReactNode } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { FederationProvider } from '@/components/FederationContext'
import { AdminSidebarProvider } from '@/components/admin/AdminSidebarContext'
import { fetchFederationsWithLeagues } from '@/lib/dataAccess/federations'
import { getActiveLeagueId } from '@/lib/leagueSelection'
import { getRefereeDomainPageSession } from '@/lib/adminAuth'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getRefereeDomainPageSession()
  const observerOnly = session?.role === 'REFEREE_OBSERVER'
  const allFederations = await fetchFederationsWithLeagues()
  const federations = observerOnly
    ? []
    : allFederations
        .filter((federation) => session?.role !== 'FEDERATION_ADMIN' || federation.id === session.federationId)
        .map((federation) => ({
          ...federation,
          leagues: session?.role === 'LEAGUE_ADMIN'
            ? federation.leagues.filter((league) => String(league.id) === session.leagueId)
            : federation.leagues,
        }))
        .filter((federation) => session?.role !== 'LEAGUE_ADMIN' || federation.leagues.length > 0)
  const availableLeagueIds = new Set(
    federations.flatMap((federation) => federation.leagues.map((league) => league.id))
  )

  let activeLeagueId = await getActiveLeagueId()
  if (!activeLeagueId || !availableLeagueIds.has(activeLeagueId)) {
    activeLeagueId = federations[0]?.leagues[0]?.id ?? null
  }

  if (!activeLeagueId && !observerOnly) {
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
            <AdminSidebar role={session?.role} />
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
