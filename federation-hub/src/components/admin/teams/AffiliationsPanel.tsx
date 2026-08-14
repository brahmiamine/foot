'use client'

import { useEffect, useState } from 'react'

interface AffiliationsPanelProps {
  teamId: string
}

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

const STATUS_LABELS: Record<AffiliationStatus, { label: string; badge: string }> = {
  ACTIVE: { label: 'Active', badge: 'bg-success-subtle text-success' },
  SUSPENDED: { label: 'Suspendue', badge: 'bg-warning-subtle text-warning' },
  ENDED: { label: 'Clôturée', badge: 'bg-secondary-subtle text-secondary' },
}

/**
 * migration.md §6/§9, Phase 2 : historique d'affiliation club ↔ fédération/
 * ligue/saison. Rattacher une nouvelle affiliation clôture automatiquement
 * l'ACTIVE précédente côté serveur (promotion/relégation/changement de
 * ligue) — pas besoin de le faire ici.
 */
export default function AffiliationsPanel({ teamId }: AffiliationsPanelProps) {
  const [affiliations, setAffiliations] = useState<Affiliation[]>([])
  const [federations, setFederations] = useState<Federation[]>([])
  const [leagues, setLeagues] = useState<LeagueOption[]>([])
  const [saisons, setSaisons] = useState<SaisonOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ federation_id: '', league_id: '', saison_id: '', start_date: '', notes: '' })
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [affiliationsRes, federationsRes, leaguesRes, saisonsRes] = await Promise.all([
        fetch(`/api/admin/teams/${teamId}/affiliations`, { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/federations', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/leagues', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/saisons', { cache: 'no-store', credentials: 'include' }),
      ])
      if (!affiliationsRes.ok) throw new Error('Chargement des affiliations impossible')
      setAffiliations(await affiliationsRes.json())
      if (federationsRes.ok) setFederations(await federationsRes.json())
      if (leaguesRes.ok) setLeagues(await leaguesRes.json())
      if (saisonsRes.ok) setSaisons(await saisonsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  const leaguesForForm = leagues.filter((l) => !form.federation_id || l.federation_id === form.federation_id)
  const federationName = (id: string) => federations.find((f) => f.id === id)?.nom ?? id
  const leagueName = (id: string | null) => (id ? leagues.find((l) => l.id === id)?.nom ?? id : '—')
  const saisonName = (id: string | null) => (id ? saisons.find((s) => s.id === id)?.nom ?? id : '—')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/affiliations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          federation_id: form.federation_id,
          league_id: form.league_id || null,
          saison_id: form.saison_id || null,
          start_date: form.start_date,
          notes: form.notes || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? "Erreur lors de la création de l'affiliation")
      setForm({ federation_id: '', league_id: '', saison_id: '', start_date: '', notes: '' })
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(affiliation: Affiliation, status: AffiliationStatus) {
    if (status === 'ENDED') {
      const endDate = window.prompt('Date de clôture (AAAA-MM-JJ) :', new Date().toISOString().slice(0, 10))
      if (!endDate) return
      await patchAffiliation(affiliation.id, { status, end_date: endDate })
      return
    }
    await patchAffiliation(affiliation.id, { status })
  }

  async function patchAffiliation(affiliationId: string, body: Record<string, string>) {
    setBusyId(affiliationId)
    setError(null)
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/affiliations/${affiliationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la mise à jour')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="col-12 col-lg-4">
      <div className="card border border-secondary">
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h5 className="mb-0">Affiliations</h5>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuler' : '+ Rattacher'}
          </button>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}

          {showForm && (
            <form onSubmit={handleCreate} className="row g-2 mb-3">
              <div className="col-12">
                <label className="form-label small mb-1">Fédération</label>
                <select
                  required
                  className="form-select form-select-sm"
                  value={form.federation_id}
                  onChange={(e) => setForm({ ...form, federation_id: e.target.value, league_id: '' })}
                >
                  <option value="">Sélectionner...</option>
                  {federations.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label small mb-1">Ligue (optionnel)</label>
                <select
                  className="form-select form-select-sm"
                  value={form.league_id}
                  onChange={(e) => setForm({ ...form, league_id: e.target.value })}
                >
                  <option value="">Aucune</option>
                  {leaguesForForm.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label small mb-1">Saison (optionnel)</label>
                <select
                  className="form-select form-select-sm"
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
              <div className="col-12">
                <label className="form-label small mb-1">Date de début</label>
                <input
                  type="date"
                  required
                  className="form-control form-control-sm"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="col-12">
                <label className="form-label small mb-1">Notes (optionnel)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="col-12 text-end">
                <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Rattacher'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-muted small mb-0">Chargement...</p>
          ) : affiliations.length === 0 ? (
            <p className="text-muted small mb-0">Aucune affiliation pour ce club.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {affiliations.map((affiliation) => {
                const status = STATUS_LABELS[affiliation.status]
                return (
                  <li key={affiliation.id} className="list-group-item px-0">
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div>
                        <div className="fw-medium small">{federationName(affiliation.federationId)}</div>
                        <div className="text-muted small">
                          {leagueName(affiliation.leagueId)} · {saisonName(affiliation.saisonId)}
                        </div>
                        <div className="text-muted small">
                          {affiliation.startDate} → {affiliation.endDate ?? 'en cours'}
                        </div>
                        {affiliation.notes && <div className="text-muted small fst-italic">{affiliation.notes}</div>}
                      </div>
                      <span className={`badge ${status.badge}`}>{status.label}</span>
                    </div>
                    {affiliation.status !== 'ENDED' && (
                      <div className="d-flex gap-2 mt-2">
                        {affiliation.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            disabled={busyId === affiliation.id}
                            onClick={() => handleStatusChange(affiliation, 'SUSPENDED')}
                          >
                            Suspendre
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            disabled={busyId === affiliation.id}
                            onClick={() => handleStatusChange(affiliation, 'ACTIVE')}
                          >
                            Réactiver
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyId === affiliation.id}
                          onClick={() => handleStatusChange(affiliation, 'ENDED')}
                        >
                          Clôturer
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
