import { CritereCategory, CritereDefinition, Vote } from '@/types'

export interface RankingEntry {
  arbitreId: string
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  photo_url?: string | null
  moyenne: number
  votes: number
  criteres?: Record<string, number | null>
}

interface BuildRankingOptions {
  criteres?: CritereDefinition[]
  includeCategories?: CritereCategory[]
}

export function buildRanking(
  votes: Vote[],
  options: BuildRankingOptions = {}
): RankingEntry[] {
  const criteresOrder = options.criteres?.map((critere) => critere.id) ?? []
  const criteresMeta = new Map(
    (options.criteres ?? []).map((critere) => [critere.id, critere])
  )
  const allowedCategories = options.includeCategories
    ? new Set(options.includeCategories)
    : null

  const map = new Map<
    string,
    {
      nom: string
      nom_en?: string | null
      nom_ar?: string | null
      photo_url?: string | null
      total: number
      count: number
      criteres: Record<string, { total: number; count: number }>
    }
  >()

  votes.forEach((vote) => {
    if (!vote.arbitre) return
    const current = map.get(vote.arbitre.id) ?? {
      nom: vote.arbitre.nom,
      nom_en: vote.arbitre.nom_en,
      nom_ar: vote.arbitre.nom_ar,
      photo_url: vote.arbitre.photo_url,
      total: 0,
      count: 0,
      criteres: {},
    }

    if (!current.nom_en && vote.arbitre.nom_en) {
      current.nom_en = vote.arbitre.nom_en
    }
    if (!current.nom_ar && vote.arbitre.nom_ar) {
      current.nom_ar = vote.arbitre.nom_ar
    }
    if (!current.photo_url && vote.arbitre.photo_url) {
      current.photo_url = vote.arbitre.photo_url
    }

    current.total += Number(vote.note_globale)
    current.count += 1

    if (vote.criteres && typeof vote.criteres === 'object') {
      Object.entries(vote.criteres as Record<string, number>).forEach(
        ([key, value]) => {
          const critereMeta = criteresMeta.get(key)
          if (allowedCategories) {
            if (!critereMeta || !allowedCategories.has(critereMeta.categorie)) {
              return
            }
          }
          if (value === undefined || value === null) return
          const parsed = Number(value)
          if (Number.isNaN(parsed)) return
          current.criteres[key] = current.criteres[key] ?? { total: 0, count: 0 }
          current.criteres[key].total += parsed
          current.criteres[key].count += 1
        }
      )
    }

    map.set(vote.arbitre.id, current)
  })

  return Array.from(map.entries())
    .map(([arbitreId, value]) => {
      const rawKeys =
        criteresOrder.length > 0
          ? Array.from(new Set([...criteresOrder, ...Object.keys(value.criteres)]))
          : Object.keys(value.criteres)

      const criteresKeys = rawKeys.filter((key) => {
        if (!allowedCategories) return true
        const meta = criteresMeta.get(key)
        return meta ? allowedCategories.has(meta.categorie) : false
      })

      const criteresAverages: Record<string, number | null> = {}
      criteresKeys.forEach((key) => {
        const stat = value.criteres[key]
        if (!stat || stat.count === 0) {
          criteresAverages[key] = null
          return
        }
        criteresAverages[key] =
          Math.round((stat.total / stat.count) * 100) / 100
      })

      return {
        arbitreId,
        nom: value.nom,
      nom_en: value.nom_en,
        nom_ar: value.nom_ar,
        photo_url: value.photo_url,
        moyenne: Math.round((value.total / value.count) * 100) / 100,
        votes: value.count,
        criteres: criteresAverages,
      }
    })
    .sort((a, b) => {
      if (b.moyenne !== a.moyenne) {
        return b.moyenne - a.moyenne
      }
      return b.votes - a.votes
    })
}


