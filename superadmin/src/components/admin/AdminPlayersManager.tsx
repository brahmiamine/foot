'use client'

import { useEffect, useMemo, useState } from 'react'

interface Federation {
  id: string
  nom: string
}

interface LeagueOption {
  id: string
  nom: string
  federation_id: string
}

interface SaisonOption {
  id: string
  nom: string
}

interface TeamOption {
  id: string
  nom: string
}

interface PlayerRow {
  id: string
  name: string
  number: number
  teamId: string
  teamName: string | null
  category: string
  position: string | null
  status: string
  isActive: boolean
}

const STATUS_LABELS: Record<string, string> = {
  TITULAR: 'Titulaire',
  SUBSTITUTE: 'Remplaçant',
  BLANK: 'Vierge',
  ENTERING: 'Entrant',
  OUT_OF_LIST: 'Hors liste',
  SUSPENDED: 'Suspendu',
}

const emptyFilters = {
  federation_id: '',
  league_id: '',
  saison_id: '',
  team_id: '',
  category: '',
  position: '',
  status: '',
  q: '',
}

/**
 * migration.md §18, Phase 3 : vue globale des joueurs — filtres fédération/
 * ligue/saison résolus via `team_affiliations`, club/catégorie/poste/statut
 * directement sur `Player` (teamManager, lecture seule). Pour un
 * FEDERATION_ADMIN, `federation_id` est forcé côté serveur (jamais le
 * sélecteur ci-dessous, masqué pour ce rôle).
 */
export default function AdminPlayersManager({ isPlatform }: { isPlatform: boolean }) {
  const [federations, setFederations] = useState<Federation[]>([])
  const [leagues, setLeagues] = useState<LeagueOption[]>([])
  const [saisons, setSaisons] = useState<SaisonOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loadingReference, setLoadingReference] = useState(true)
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState(emptyFilters)

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [federationsRes, leaguesRes, saisonsRes, teamsRes] = await Promise.all([
          fetch('/api/admin/federations', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/admin/leagues', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/admin/saisons', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/admin/teams', { cache: 'no-store', credentials: 'include' }),
        ])
        if (federationsRes.ok) setFederations(await federationsRes.json())
        if (leaguesRes.ok) setLeagues(await leaguesRes.json())
        if (saisonsRes.ok) setSaisons(await saisonsRes.json())
        if (teamsRes.ok) setTeams(await teamsRes.json())
      } catch {
        setError('Erreur lors du chargement des données de référence')
      } finally {
        setLoadingReference(false)
      }
    }
    loadReferenceData()
  }, [])

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    setLoadingPlayers(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (isPlatform && filters.federation_id) params.set('federation_id', filters.federation_id)
      if (filters.league_id) params.set('league_id', filters.league_id)
      if (filters.saison_id) params.set('saison_id', filters.saison_id)
      if (filters.team_id) params.set('team_id', filters.team_id)
      if (filters.category) params.set('category', filters.category)
      if (filters.position) params.set('position', filters.position)
      if (filters.status) params.set('status', filters.status)
      if (filters.q) params.set('q', filters.q)

      const response = await fetch(`/api/admin/players?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Chargement des joueurs impossible')
      setPlayers(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoadingPlayers(false)
    }
  }

  useEffect(() => {
    if (!loadingReference) search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingReference])

  const leaguesForFilter = useMemo(
    () => (filters.federation_id ? leagues.filter((l) => l.federation_id === filters.federation_id) : leagues),
    [leagues, filters.federation_id],
  )

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="mb-1">Joueurs</h2>
        <p className="text-muted mb-0">Référentiel joueurs, tous clubs confondus (migration.md §18).</p>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {loadingReference ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : (
            <form onSubmit={search} className="row g-3">
              {isPlatform && (
                <div className="col-6 col-md-3">
                  <label className="form-label">Fédération</label>
                  <select
                    className="form-select"
                    value={filters.federation_id}
                    onChange={(e) => setFilters({ ...filters, federation_id: e.target.value, league_id: '' })}
                  >
                    <option value="">Toutes</option>
                    {federations.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-6 col-md-3">
                <label className="form-label">Ligue</label>
                <select
                  className="form-select"
                  value={filters.league_id}
                  onChange={(e) => setFilters({ ...filters, league_id: e.target.value })}
                >
                  <option value="">Toutes</option>
                  {leaguesForFilter.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Saison</label>
                <select
                  className="form-select"
                  value={filters.saison_id}
                  onChange={(e) => setFilters({ ...filters, saison_id: e.target.value })}
                >
                  <option value="">Toutes</option>
                  {saisons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Club</label>
                <select
                  className="form-select"
                  value={filters.team_id}
                  onChange={(e) => setFilters({ ...filters, team_id: e.target.value })}
                >
                  <option value="">Tous</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">Catégorie</label>
                <input
                  type="text"
                  placeholder="seniors, u17..."
                  className="form-control"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Poste</label>
                <input
                  type="text"
                  placeholder="GOALKEEPER, DEFENDER..."
                  className="form-control"
                  value={filters.position}
                  onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Statut</label>
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Tous</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Recherche</label>
                <input
                  type="text"
                  placeholder="Nom du joueur..."
                  className="form-control"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
              </div>

              <div className="col-12 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setFilters(emptyFilters)
                    search()
                  }}
                >
                  Réinitialiser
                </button>
                <button type="submit" className="btn btn-primary" disabled={loadingPlayers}>
                  {loadingPlayers ? 'Recherche...' : 'Filtrer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {loadingPlayers ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : players.length === 0 ? (
            <p className="text-muted mb-0">Aucun joueur ne correspond à ces filtres.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Joueur</th>
                    <th>Club</th>
                    <th>Catégorie</th>
                    <th>Poste</th>
                    <th>Statut</th>
                    <th>Actif</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td>
                        #{p.number} {p.name}
                      </td>
                      <td>{p.teamName ?? p.teamId}</td>
                      <td>{p.category}</td>
                      <td>{p.position ?? '—'}</td>
                      <td>{STATUS_LABELS[p.status] ?? p.status}</td>
                      <td>{p.isActive ? 'Oui' : 'Non'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {players.length >= 200 && (
                <p className="text-muted small mt-2 mb-0">
                  200 premiers résultats affichés — affinez les filtres pour voir davantage.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
