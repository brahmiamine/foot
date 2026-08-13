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

type AffiliationStatus = 'ACTIVE' | 'ENDED' | 'SUSPENDED'

interface Affiliation {
  id: string
  teamId: string
  federationId: string
  leagueId: string | null
  saisonId: string | null
  status: AffiliationStatus
  startDate: string
  endDate: string | null
  notes: string | null
}

interface AffiliationRow {
  affiliation: Affiliation
  team: { id: string; nom: string; logo_url: string | null } | null
}

const STATUS_LABELS: Record<AffiliationStatus, { label: string; badge: string }> = {
  ACTIVE: { label: 'Active', badge: 'bg-success-subtle text-success' },
  SUSPENDED: { label: 'Suspendue', badge: 'bg-warning-subtle text-warning' },
  ENDED: { label: 'Clôturée', badge: 'bg-secondary-subtle text-secondary' },
}

/**
 * migration.md §6/§9, Phase 2 : écran "clubs affiliés" dédié à un
 * FEDERATION_ADMIN — contrairement au panneau `AffiliationsPanel` intégré
 * au gros écran générique `/admin/teams` (réservé PLATFORM_SUPERADMIN),
 * celui-ci ne dépend d'aucune route platform-only : accessible directement
 * par un FEDERATION_ADMIN pour gérer les clubs de SA fédération.
 */
export default function AdminFederationAffiliationsManager({
  isPlatform,
  ownFederationId,
}: {
  isPlatform: boolean
  ownFederationId: string | null
}) {
  const [federations, setFederations] = useState<Federation[]>([])
  const [selectedFederationId, setSelectedFederationId] = useState<string>(ownFederationId ?? '')
  const [rows, setRows] = useState<AffiliationRow[]>([])
  const [leagues, setLeagues] = useState<LeagueOption[]>([])
  const [saisons, setSaisons] = useState<SaisonOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ team_id: '', league_id: '', saison_id: '', start_date: '', notes: '' })
  const [teamSearch, setTeamSearch] = useState('')

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [leaguesRes, saisonsRes, teamsRes] = await Promise.all([
          fetch('/api/admin/leagues', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/admin/saisons', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/admin/teams', { cache: 'no-store', credentials: 'include' }),
        ])
        if (leaguesRes.ok) setLeagues(await leaguesRes.json())
        if (saisonsRes.ok) setSaisons(await saisonsRes.json())
        if (teamsRes.ok) setTeams(await teamsRes.json())
        if (isPlatform) {
          const federationsRes = await fetch('/api/admin/federations', { cache: 'no-store', credentials: 'include' })
          if (federationsRes.ok) {
            const data: Federation[] = await federationsRes.json()
            setFederations(data)
            setSelectedFederationId((current) => current || data[0]?.id || '')
          }
        }
      } catch {
        setError('Erreur lors du chargement des données de référence')
      }
    }
    loadReferenceData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAffiliations(federationId: string) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/federations/${federationId}/affiliations`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Chargement des affiliations impossible')
      setRows(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedFederationId) loadAffiliations(selectedFederationId)
  }, [selectedFederationId])

  const leaguesForFederation = useMemo(
    () => leagues.filter((l) => l.federation_id === selectedFederationId),
    [leagues, selectedFederationId],
  )
  const filteredTeams = useMemo(() => {
    if (!teamSearch.trim()) return teams.slice(0, 50)
    const q = teamSearch.trim().toLowerCase()
    return teams.filter((t) => t.nom.toLowerCase().includes(q)).slice(0, 50)
  }, [teams, teamSearch])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.team_id) {
      setError('Sélectionnez un club')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/teams/${form.team_id}/affiliations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          federation_id: selectedFederationId,
          league_id: form.league_id || null,
          saison_id: form.saison_id || null,
          start_date: form.start_date,
          notes: form.notes || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? "Erreur lors de la création de l'affiliation")
      setForm({ team_id: '', league_id: '', saison_id: '', start_date: '', notes: '' })
      setTeamSearch('')
      setShowForm(false)
      await loadAffiliations(selectedFederationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(row: AffiliationRow, status: AffiliationStatus) {
    if (status === 'ENDED') {
      const endDate = window.prompt('Date de clôture (AAAA-MM-JJ) :', new Date().toISOString().slice(0, 10))
      if (!endDate) return
      await patchAffiliation(row, { status, end_date: endDate })
      return
    }
    await patchAffiliation(row, { status })
  }

  async function patchAffiliation(row: AffiliationRow, body: Record<string, string>) {
    setBusyId(row.affiliation.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/teams/${row.affiliation.teamId}/affiliations/${row.affiliation.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la mise à jour')
      await loadAffiliations(selectedFederationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Clubs affiliés</h2>
          <p className="text-muted mb-0">
            Historique d&apos;affiliation club ↔ fédération/ligue/saison (migration.md §6).
          </p>
        </div>
        {selectedFederationId && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Annuler' : '+ Affilier un club'}
          </button>
        )}
      </div>

      {isPlatform && (
        <div className="col-12 col-md-4">
          <label className="form-label">Fédération</label>
          <select
            className="form-select"
            value={selectedFederationId}
            onChange={(e) => setSelectedFederationId(e.target.value)}
          >
            {federations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {showForm && selectedFederationId && (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <form onSubmit={handleCreate} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Club</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Rechercher un club..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                />
                <select
                  required
                  className="form-select"
                  value={form.team_id}
                  onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                >
                  <option value="">Sélectionner...</option>
                  {filteredTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Ligue (optionnel)</label>
                <select
                  className="form-select"
                  value={form.league_id}
                  onChange={(e) => setForm({ ...form, league_id: e.target.value })}
                >
                  <option value="">Aucune</option>
                  {leaguesForFederation.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Saison (optionnel)</label>
                <select
                  className="form-select"
                  value={form.saison_id}
                  onChange={(e) => setForm({ ...form, saison_id: e.target.value })}
                >
                  <option value="">Aucune</option>
                  {saisons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Date de début</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Notes (optionnel)</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Affilier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {!selectedFederationId ? (
            <p className="text-muted mb-0">Aucune fédération disponible.</p>
          ) : loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted mb-0">Aucun club affilié pour l&apos;instant.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Club</th>
                    <th>Ligue</th>
                    <th>Saison</th>
                    <th>Période</th>
                    <th>Statut</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const status = STATUS_LABELS[row.affiliation.status]
                    const league = leagues.find((l) => l.id === row.affiliation.leagueId)
                    const saison = saisons.find((s) => s.id === row.affiliation.saisonId)
                    return (
                      <tr key={row.affiliation.id}>
                        <td>{row.team?.nom ?? row.affiliation.teamId}</td>
                        <td>{league?.nom ?? '—'}</td>
                        <td>{saison?.nom ?? '—'}</td>
                        <td className="text-muted small">
                          {row.affiliation.startDate} → {row.affiliation.endDate ?? 'en cours'}
                        </td>
                        <td>
                          <span className={`badge ${status.badge}`}>{status.label}</span>
                        </td>
                        <td className="text-end">
                          {row.affiliation.status !== 'ENDED' && (
                            <div className="d-flex gap-2 justify-content-end">
                              {row.affiliation.status === 'ACTIVE' ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  disabled={busyId === row.affiliation.id}
                                  onClick={() => handleStatusChange(row, 'SUSPENDED')}
                                >
                                  Suspendre
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  disabled={busyId === row.affiliation.id}
                                  onClick={() => handleStatusChange(row, 'ACTIVE')}
                                >
                                  Réactiver
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={busyId === row.affiliation.id}
                                onClick={() => handleStatusChange(row, 'ENDED')}
                              >
                                Clôturer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
