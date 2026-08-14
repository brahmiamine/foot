import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { Federation, League } from '../entities'

async function fetchFederationsWithLeaguesUncached() {
  const dataSource = await getDataSource()
  // Récupérer uniquement les fédérations actives
  const federations = await dataSource.query<Federation[]>(
    'SELECT id, code, nom, nom_en, nom_ar, logo_url, is_active FROM federations WHERE is_active = true ORDER BY nom ASC'
  )
  // Récupérer uniquement les ligues actives appartenant à des fédérations actives
  const leagues = await dataSource.query<League[]>(
    `SELECT l.id, l.federation_id, l.nom, l.nom_en, l.nom_ar, l.logo_url, l.is_active
     FROM ligues l
     INNER JOIN federations f ON l.federation_id = f.id
     WHERE l.is_active = true AND f.is_active = true
     ORDER BY l.nom ASC`
  )
  const leaguesByFederation = new Map<string, League[]>()
  leagues.forEach((league: League) => {
    const group = leaguesByFederation.get(league.federation_id) ?? []
    group.push(league)
    leaguesByFederation.set(league.federation_id, group)
  })
  return federations.map((federation: Federation) => ({
    ...federation,
    leagues: leaguesByFederation.get(federation.id) ?? [],
  }))
}

export const fetchFederationsWithLeagues = unstable_cache(
  fetchFederationsWithLeaguesUncached,
  ['fetchFederationsWithLeagues'],
  { revalidate: 120 }
)
