import type { DataSource } from 'typeorm'
import {
  Arbitre,
  CritereDefinitionEntity,
  Federation,
  Journee,
  League,
  Match,
  Saison,
  Team,
  Vote,
} from '@/lib/entities'

/**
 * Seeds a minimal but realistic Federation -> League -> Saison -> Journee -> Match graph
 * (plus a couple of Teams and an Arbitre) into the given test DataSource, and returns the
 * created rows so tests can seed Votes / assert against them.
 */
export async function seedBaseGraph(dataSource: DataSource) {
  const federationRepo = dataSource.getRepository<Federation>('federations')
  const leagueRepo = dataSource.getRepository<League>('ligues')
  const saisonRepo = dataSource.getRepository<Saison>('saisons')
  const journeeRepo = dataSource.getRepository<Journee>('journees')
  const teamRepo = dataSource.getRepository<Team>('teams')
  const arbitreRepo = dataSource.getRepository<Arbitre>('arbitres')
  const matchRepo = dataSource.getRepository<Match>('matches')

  const federation = await federationRepo.save(
    federationRepo.create({ code: 'FTF', nom: 'Fédération Tunisienne de Football', is_active: true })
  )

  const league = await leagueRepo.save(
    leagueRepo.create({ federation_id: federation.id, nom: 'Ligue 1', is_active: true })
  )

  const saison = await saisonRepo.save(
    saisonRepo.create({
      nom: 'Saison 2025-2026',
      type_competition: 'championnat',
      league_id: league.id,
      date_debut: '2025-08-01',
      date_fin: '2026-06-01',
    })
  )

  const journee = await journeeRepo.save(
    journeeRepo.create({
      saison_id: saison.id,
      numero: 1,
      nom_fr: 'Journée 1',
      date_journee: new Date('2026-01-10'),
    })
  )

  const homeTeam = await teamRepo.save(
    teamRepo.create({ nom: 'Espérance de Tunis', abbr: 'EST', team_type: 'club', sport: 'football', age_category: 'seniors' })
  )
  const awayTeam = await teamRepo.save(
    teamRepo.create({ nom: 'Club Africain', abbr: 'CA', team_type: 'club', sport: 'football', age_category: 'seniors' })
  )

  const arbitre = await arbitreRepo.save(
    arbitreRepo.create({ nom: 'Jean Dupont', nom_en: 'John Doe' })
  )

  const match = await matchRepo.save(
    matchRepo.create({
      journee_id: journee.id,
      equipe_home_id: homeTeam.id,
      equipe_away_id: awayTeam.id,
      arbitre_id: arbitre.id,
      date: new Date('2026-01-10T20:00:00Z'),
      score_home: 2,
      score_away: 1,
    })
  )

  return { federation, league, saison, journee, homeTeam, awayTeam, arbitre, match }
}

export async function seedCriteres(dataSource: DataSource) {
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  return repo.save([
    repo.create({ id: 'decisions_cles', categorie: 'arbitre', label_fr: 'Décisions clés', label_ar: 'قرارات رئيسية' }),
    repo.create({ id: 'gestion_match', categorie: 'arbitre', label_fr: 'Gestion du match', label_ar: 'إدارة المباراة' }),
    repo.create({ id: 'usage_var', categorie: 'var', label_fr: 'Usage de la VAR', label_ar: 'استخدام الفار' }),
  ])
}

interface VoteFixtureOverrides {
  note_globale?: number
  criteres?: Record<string, number>
  created_at?: Date
  device_fingerprint?: string | null
  ip_address?: string | null
}

export async function seedVote(
  dataSource: DataSource,
  matchId: string,
  arbitreId: string,
  overrides: VoteFixtureOverrides = {}
) {
  const repo = dataSource.getRepository<Vote>('votes')
  return repo.save(
    repo.create({
      match_id: matchId,
      arbitre_id: arbitreId,
      note_globale: overrides.note_globale ?? 4,
      criteres: overrides.criteres ?? { decisions_cles: 4, gestion_match: 4 },
      created_at: overrides.created_at ?? new Date(),
      device_fingerprint: overrides.device_fingerprint ?? `fp-${Math.random().toString(36).slice(2)}`,
      ip_address: overrides.ip_address ?? '127.0.0.1',
    })
  )
}
