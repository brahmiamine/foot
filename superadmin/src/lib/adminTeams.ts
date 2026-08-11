import { getDataSource } from './db'
import { Team } from './entities'
import { toPlain, toPlainArray } from './serialization'
import type { TeamType, Sport, AgeCategory, Gender } from '@/types'

export interface TeamFilters {
  search?: string
  team_type?: TeamType | 'all'
  country_code?: string | 'all'
  sport?: Sport | 'all'
  age_category?: AgeCategory | 'all'
  gender?: Gender | 'all'
}

export interface TeamCreateInput {
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  abbr?: string | null
  team_type?: TeamType
  country_code?: string | null
  sport?: Sport
  age_category?: AgeCategory
  gender?: Gender
  city?: string | null
  city_en?: string | null
  city_ar?: string | null
  stadium?: string | null
  stadium_ar?: string | null
  logo_url?: string | null
  api_football_id?: number | null
}

export interface TeamUpdateInput {
  nom?: string
  nom_en?: string | null
  nom_ar?: string | null
  abbr?: string | null
  team_type?: TeamType
  country_code?: string | null
  sport?: Sport
  age_category?: AgeCategory
  gender?: Gender
  city?: string | null
  city_en?: string | null
  city_ar?: string | null
  stadium?: string | null
  stadium_ar?: string | null
  logo_url?: string | null
  /**
   * Id API-Football de l'équipe (écran de mapping /admin/api-football).
   * `null` retire le mapping. `undefined` (champ absent du payload) laisse
   * la valeur existante inchangée — même convention que les autres champs
   * de cette interface.
   */
  api_football_id?: number | null
}

/**
 * Liste toutes les équipes avec filtres optionnels
 */
export async function listTeamsForAdmin(filters: TeamFilters = {}) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')

  const qb = repo.createQueryBuilder('team')
    .orderBy('team.nom', 'ASC')

  // Filtre par recherche textuelle
  if (filters.search && filters.search.trim()) {
    const search = `%${filters.search.trim()}%`
    qb.andWhere(
      '(team.nom LIKE :search OR team.nom_en LIKE :search OR team.nom_ar LIKE :search OR team.abbr LIKE :search OR team.city LIKE :search)',
      { search }
    )
  }

  // Filtre par type d'équipe
  if (filters.team_type && filters.team_type !== 'all') {
    qb.andWhere('team.team_type = :team_type', { team_type: filters.team_type })
  }

  // Filtre par pays
  if (filters.country_code && filters.country_code !== 'all') {
    qb.andWhere('team.country_code = :country_code', { country_code: filters.country_code })
  }

  // Filtre par sport
  if (filters.sport && filters.sport !== 'all') {
    qb.andWhere('team.sport = :sport', { sport: filters.sport })
  }

  // Filtre par catégorie d'âge
  if (filters.age_category && filters.age_category !== 'all') {
    qb.andWhere('team.age_category = :age_category', { age_category: filters.age_category })
  }

  // Filtre par genre
  if (filters.gender && filters.gender !== 'all') {
    qb.andWhere('team.gender = :gender', { gender: filters.gender })
  }

  const teams = await qb.getMany()
  return toPlainArray(teams)
}

/**
 * Récupère les valeurs uniques pour les filtres
 */
export async function getTeamsFilterOptions() {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')

  // Récupérer les codes pays uniques
  const countryResults = await repo
    .createQueryBuilder('team')
    .select('DISTINCT team.country_code', 'country_code')
    .where('team.country_code IS NOT NULL')
    .orderBy('team.country_code', 'ASC')
    .getRawMany()

  const countries = countryResults
    .map((r: { country_code: string | null }) => r.country_code)
    .filter((c): c is string => c !== null)

  return {
    team_types: ['club', 'national'] as TeamType[],
    sports: ['football', 'handball', 'basketball', 'volleyball'] as Sport[],
    age_categories: [
      'seniors',
      'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
      'u12', 'u11', 'u10', 'u9', 'u8', 'u7',
    ] as AgeCategory[],
    genders: ['male', 'female', 'mixed'] as Gender[],
    countries,
  }
}

/**
 * Récupère une équipe par son ID
 */
export async function getTeamById(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')

  const team = await repo.findOne({ where: { id } })
  
  if (!team) {
    return null
  }

  return toPlain(team)
}

/**
 * Crée une nouvelle équipe
 */
export async function createTeamAdmin(payload: TeamCreateInput) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')

  // Vérifier l'unicité de l'abréviation si fournie
  if (payload.abbr) {
    const existing = await repo.findOne({ where: { abbr: payload.abbr } })
    if (existing) {
      throw new Error(`Une équipe avec l'abréviation "${payload.abbr}" existe déjà`)
    }
  }

  const newTeam = repo.create({
    nom: payload.nom,
    nom_en: payload.nom_en || null,
    nom_ar: payload.nom_ar || null,
    abbr: payload.abbr || null,
    team_type: payload.team_type || 'club',
    country_code: payload.country_code || null,
    sport: payload.sport || 'football',
    age_category: payload.age_category || 'seniors',
    gender: payload.gender || 'male',
    city: payload.city || null,
    city_en: payload.city_en || null,
    city_ar: payload.city_ar || null,
    stadium: payload.stadium || null,
    stadium_ar: payload.stadium_ar || null,
    logo_url: payload.logo_url || null,
    api_football_id: payload.api_football_id ?? null,
  })

  const saved = await repo.save(newTeam)
  return toPlain(saved)
}

/**
 * Met à jour une équipe
 */
export async function updateTeamAdmin(id: string, payload: TeamUpdateInput) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')

  const team = await repo.findOne({ where: { id } })
  if (!team) {
    throw new Error('Équipe introuvable')
  }

  // Vérifier l'unicité de l'abréviation si modifiée
  if (payload.abbr !== undefined && payload.abbr !== team.abbr && payload.abbr) {
    const existing = await repo.findOne({ where: { abbr: payload.abbr } })
    if (existing && existing.id !== id) {
      throw new Error(`Une équipe avec l'abréviation "${payload.abbr}" existe déjà`)
    }
  }

  // Vérifier l'unicité de l'id API-Football si modifié (même équipe API-Football
  // mappée deux fois côté local : la contrainte UNIQUE de la colonne le
  // refuserait de toute façon, message plus clair ici avant d'y arriver)
  if (
    payload.api_football_id !== undefined &&
    payload.api_football_id !== null &&
    payload.api_football_id !== team.api_football_id
  ) {
    const existing = await repo.findOne({ where: { api_football_id: payload.api_football_id } })
    if (existing && existing.id !== id) {
      throw new Error(`L'id API-Football ${payload.api_football_id} est déjà associé à l'équipe "${existing.nom}"`)
    }
  }

  const updateData: Partial<Team> = {}

  if (payload.nom !== undefined) updateData.nom = payload.nom
  if (payload.nom_en !== undefined) updateData.nom_en = payload.nom_en
  if (payload.nom_ar !== undefined) updateData.nom_ar = payload.nom_ar
  if (payload.abbr !== undefined) updateData.abbr = payload.abbr
  if (payload.team_type !== undefined) updateData.team_type = payload.team_type
  if (payload.country_code !== undefined) updateData.country_code = payload.country_code
  if (payload.sport !== undefined) updateData.sport = payload.sport
  if (payload.age_category !== undefined) updateData.age_category = payload.age_category
  if (payload.gender !== undefined) updateData.gender = payload.gender
  if (payload.city !== undefined) updateData.city = payload.city
  if (payload.city_en !== undefined) updateData.city_en = payload.city_en
  if (payload.city_ar !== undefined) updateData.city_ar = payload.city_ar
  if (payload.stadium !== undefined) updateData.stadium = payload.stadium
  if (payload.stadium_ar !== undefined) updateData.stadium_ar = payload.stadium_ar
  if (payload.logo_url !== undefined) updateData.logo_url = payload.logo_url
  if (payload.api_football_id !== undefined) updateData.api_football_id = payload.api_football_id

  if (Object.keys(updateData).length > 0) {
    await repo.update(id, updateData)
  }

  const updated = await repo.findOne({ where: { id } })
  if (!updated) {
    throw new Error('Équipe introuvable après mise à jour')
  }

  return toPlain(updated)
}

/**
 * Supprime une équipe
 */
export async function deleteTeamAdmin(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')

  const team = await repo.findOne({ where: { id } })
  if (!team) {
    throw new Error('Équipe introuvable')
  }

  // Vérifier si l'équipe est utilisée dans des matchs
  const matchRepo = dataSource.getRepository('matches')
  const matchCount = await matchRepo
    .createQueryBuilder('match')
    .where('match.equipe_home = :id OR match.equipe_away = :id', { id })
    .getCount()

  if (matchCount > 0) {
    throw new Error(`Impossible de supprimer cette équipe car elle est associée à ${matchCount} match(s)`)
  }

  await repo.delete(id)
  return { success: true }
}

/**
 * Interface pour l'import JSON
 */
export interface TeamImportItem {
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  abbr?: string | null
  team_type?: TeamType
  country_code?: string | null
  sport?: Sport
  age_category?: AgeCategory
  gender?: Gender
  city?: string | null
  city_en?: string | null
  city_ar?: string | null
  stadium?: string | null
  stadium_ar?: string | null
  logo_url?: string | null
}

/**
 * Importe des équipes depuis un tableau JSON
 */
export async function importTeamsFromJson(teams: TeamImportItem[]) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Team>('teams')

  const results = {
    total: teams.length,
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  }

  for (const teamData of teams) {
    try {
      // Validation du nom (obligatoire)
      if (!teamData.nom || typeof teamData.nom !== 'string' || !teamData.nom.trim()) {
        results.errors.push(`Équipe ignorée: nom manquant ou invalide`)
        results.skipped++
        continue
      }

      const nom = teamData.nom.trim()

      // Vérifier si une équipe avec la même abréviation existe déjà
      if (teamData.abbr) {
        const existingByAbbr = await repo.findOne({ where: { abbr: teamData.abbr } })
        if (existingByAbbr) {
          results.errors.push(`Équipe "${nom}" ignorée: abréviation "${teamData.abbr}" déjà utilisée`)
          results.skipped++
          continue
        }
      }

      // Valider et normaliser les valeurs enum
      const validTeamTypes: TeamType[] = ['club', 'national']
      const validSports: Sport[] = ['football', 'handball', 'basketball', 'volleyball']
      const validAgeCategories: AgeCategory[] = [
        'seniors',
        'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
        'u12', 'u11', 'u10', 'u9', 'u8', 'u7',
      ]
      const validGenders: Gender[] = ['male', 'female', 'mixed']

      const team_type: TeamType = teamData.team_type && validTeamTypes.includes(teamData.team_type)
        ? teamData.team_type
        : 'club'

      const sport: Sport = teamData.sport && validSports.includes(teamData.sport)
        ? teamData.sport
        : 'football'

      const age_category: AgeCategory = teamData.age_category && validAgeCategories.includes(teamData.age_category)
        ? teamData.age_category
        : 'seniors'

      const gender: Gender = teamData.gender && validGenders.includes(teamData.gender)
        ? teamData.gender
        : 'male'

      // Créer l'équipe
      const newTeam = repo.create({
        nom,
        nom_en: teamData.nom_en || null,
        nom_ar: teamData.nom_ar || null,
        abbr: teamData.abbr || null,
        team_type,
        country_code: teamData.country_code || null,
        sport,
        age_category,
        gender,
        city: teamData.city || null,
        city_en: teamData.city_en || null,
        city_ar: teamData.city_ar || null,
        stadium: teamData.stadium || null,
        stadium_ar: teamData.stadium_ar || null,
        logo_url: teamData.logo_url || null,
      })

      await repo.save(newTeam)
      results.imported++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
      results.errors.push(`Équipe "${teamData.nom || 'N/A'}": ${errorMsg}`)
      results.skipped++
    }
  }

  return results
}

