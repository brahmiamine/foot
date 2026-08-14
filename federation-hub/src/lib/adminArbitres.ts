import { In } from 'typeorm'
import { getDataSource } from './db'
import { Arbitre } from './entities'
import { toPlain, toPlainArray } from './serialization'

export interface ArbitreInput {
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  nationalite?: string | null
  nationalite_ar?: string | null
  date_naissance?: string | null
  photo_url?: string | null
  federation_id?: string | null
  league_id?: string | null
  categorie?: string | null
  grade?: string | null
  status?: string | null
  is_active?: boolean
  start_date?: string | null
}

export interface ArbitreImportInput extends ArbitreInput {
  id?: string
}

function normalizeString(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

export async function listArbitres(scope: { federationId?: string | null; leagueId?: string | null } = {}) {
  const ds = await getDataSource()
  const repo = ds.getRepository<Arbitre>('arbitres')
  const qb = repo.createQueryBuilder('arbitre').orderBy('arbitre.nom', 'ASC')
  if (scope.federationId) qb.where('arbitre.federation_id = :federationId', { federationId: scope.federationId })
  if (scope.leagueId) qb.where('arbitre.league_id = :leagueId', { leagueId: scope.leagueId })
  const rows = await qb.getMany()
  return toPlainArray(rows)
}

export async function countArbitres(): Promise<number> {
  const ds = await getDataSource()
  const repo = ds.getRepository<Arbitre>('arbitres')
  return await repo.count()
}

export async function createArbitre(payload: ArbitreInput) {
  if (!payload.nom?.trim()) {
    throw new Error('Le nom est obligatoire')
  }

  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Arbitre>('arbitres')
  const arbitre = repo.create({
    nom: payload.nom.trim(),
    nom_en: normalizeString(payload.nom_en),
    nom_ar: normalizeString(payload.nom_ar),
    nationalite: normalizeString(payload.nationalite) ?? 'Tunisie',
    nationalite_ar: normalizeString(payload.nationalite_ar) ?? 'تونس',
    date_naissance: normalizeDate(payload.date_naissance),
    photo_url: normalizeString(payload.photo_url),
    federation_id: normalizeString(payload.federation_id),
    league_id: normalizeString(payload.league_id),
    categorie: normalizeString(payload.categorie),
    grade: normalizeString(payload.grade),
    status: normalizeString(payload.status) ?? 'ACTIVE',
    is_active: payload.is_active ?? true,
    start_date: normalizeDate(payload.start_date),
  })

  const saved = await repo.save(arbitre)
  return toPlain(saved)
}

export async function updateArbitre(id: string, payload: ArbitreInput) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Arbitre>('arbitres')
  const existing = await repo.findOne({ where: { id } })

  if (!existing) {
    throw new Error('Arbitre introuvable')
  }

  repo.merge(existing, {
    nom: payload.nom?.trim() ?? existing.nom,
    nom_en: payload.nom_en === undefined ? existing.nom_en : normalizeString(payload.nom_en),
    nom_ar: payload.nom_ar === undefined ? existing.nom_ar : normalizeString(payload.nom_ar),
    nationalite:
      payload.nationalite === undefined ? existing.nationalite : normalizeString(payload.nationalite),
    nationalite_ar:
      payload.nationalite_ar === undefined
        ? existing.nationalite_ar
        : normalizeString(payload.nationalite_ar),
    date_naissance:
      payload.date_naissance === undefined
        ? existing.date_naissance
        : normalizeDate(payload.date_naissance),
    photo_url:
      payload.photo_url === undefined
        ? existing.photo_url
        : payload.photo_url === null
          ? null
          : normalizeString(payload.photo_url),
    federation_id: payload.federation_id === undefined ? existing.federation_id : normalizeString(payload.federation_id),
    league_id: payload.league_id === undefined ? existing.league_id : normalizeString(payload.league_id),
    categorie: payload.categorie === undefined ? existing.categorie : normalizeString(payload.categorie),
    grade: payload.grade === undefined ? existing.grade : normalizeString(payload.grade),
    status: payload.status === undefined ? existing.status : normalizeString(payload.status) ?? 'ACTIVE',
    is_active: payload.is_active === undefined ? existing.is_active : payload.is_active,
    start_date: payload.start_date === undefined ? existing.start_date : normalizeDate(payload.start_date),
  })

  const saved = await repo.save(existing)
  return toPlain(saved)
}

export async function importArbitres(rows: ArbitreImportInput[]) {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0 }
  }

  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Arbitre>('arbitres')

  const ids = rows.map((row) => row.id).filter((id): id is string => Boolean(id))
  const names = rows
    .filter((row) => row.nom?.trim())
    .map((row) => row.nom.trim())

  const existingById = new Map<string, Arbitre>()
  if (ids.length > 0) {
    const existingIds = await repo.find({ where: { id: In(ids) } })
    existingIds.forEach((arbitre) => existingById.set(arbitre.id, arbitre))
  }

  const existingByName = new Map<string, Arbitre>()
  if (names.length > 0) {
    const existingNames = await repo.find({ where: { nom: In(names) } })
    existingNames.forEach((arbitre) => existingByName.set(arbitre.nom.toLowerCase(), arbitre))
  }

  let inserted = 0
  let updated = 0
  const toSave: Arbitre[] = []

  rows.forEach((row) => {
    if (!row.nom?.trim()) {
      return
    }

    const normalizedName = row.nom.trim()
    const normalizedNameKey = normalizedName.toLowerCase()
    const target =
      (row.id && existingById.get(row.id)) || existingByName.get(normalizedNameKey) || null

    if (target) {
      repo.merge(target, {
        nom: normalizedName,
        nom_en: row.nom_en === undefined ? target.nom_en : normalizeString(row.nom_en),
        nom_ar: normalizeString(row.nom_ar),
        nationalite: normalizeString(row.nationalite) ?? target.nationalite,
        nationalite_ar: normalizeString(row.nationalite_ar) ?? target.nationalite_ar,
        date_naissance:
          row.date_naissance === undefined ? target.date_naissance : normalizeDate(row.date_naissance),
        photo_url: row.photo_url === undefined ? target.photo_url : normalizeString(row.photo_url),
        federation_id: row.federation_id === undefined ? target.federation_id : normalizeString(row.federation_id),
        league_id: row.league_id === undefined ? target.league_id : normalizeString(row.league_id),
        categorie: row.categorie === undefined ? target.categorie : normalizeString(row.categorie),
        grade: row.grade === undefined ? target.grade : normalizeString(row.grade),
        status: row.status === undefined ? target.status : normalizeString(row.status) ?? 'ACTIVE',
        is_active: row.is_active === undefined ? target.is_active : row.is_active,
        start_date: row.start_date === undefined ? target.start_date : normalizeDate(row.start_date),
      })
      updated += 1
      toSave.push(target)
    } else {
      const created = repo.create({
        nom: normalizedName,
        nom_en: normalizeString(row.nom_en),
        nom_ar: normalizeString(row.nom_ar),
        nationalite: normalizeString(row.nationalite) ?? 'Tunisie',
        nationalite_ar: normalizeString(row.nationalite_ar) ?? 'تونس',
        date_naissance: normalizeDate(row.date_naissance),
        photo_url: normalizeString(row.photo_url),
        federation_id: normalizeString(row.federation_id),
        league_id: normalizeString(row.league_id),
        categorie: normalizeString(row.categorie),
        grade: normalizeString(row.grade),
        status: normalizeString(row.status) ?? 'ACTIVE',
        is_active: row.is_active ?? true,
        start_date: normalizeDate(row.start_date),
      })
      inserted += 1
      toSave.push(created)
    }
  })

  if (toSave.length > 0) {
    await repo.save(toSave)
  }

  return { inserted, updated }
}
