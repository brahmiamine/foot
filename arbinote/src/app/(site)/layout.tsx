import { ReactNode } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import MobileNavigation from '@/components/MobileNavigation'
import CookieBanner from '@/components/CookieBanner'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { FederationProvider } from '@/components/FederationContext'
import { fetchFederationsWithLeagues } from '@/lib/dataAccess'
import { getActiveLeagueId } from '@/lib/leagueSelection'

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const federations = await fetchFederationsWithLeagues()
  const availableLeagueIds = new Set(
    federations.flatMap((fed) => fed.leagues.map((league) => league.id))
  )

  const preferredLeagueId =
    federations
      .find((fed) => fed.code === 'TUN')
      ?.leagues.find((league) => league.nom === 'Ligue Professionnelle 1')?.id ?? null

  let activeLeagueId = await getActiveLeagueId()
  if (!activeLeagueId || !availableLeagueIds.has(activeLeagueId)) {
    activeLeagueId = preferredLeagueId ?? federations[0]?.leagues[0]?.id ?? null
  }

  return (
    <FederationProvider federations={federations} initialLeagueId={activeLeagueId}>
      <div className="print:hidden">
        <PWAInstallPrompt />
        <Navigation />
      </div>
      <main className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 py-4 sm:py-8 pb-24 md:pb-8">{children}</main>
      <div className="print:hidden">
        <Footer />
        <MobileNavigation />
        <CookieBanner />
      </div>
    </FederationProvider>
  )
}


