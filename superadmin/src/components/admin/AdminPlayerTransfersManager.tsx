'use client'

import { useEffect, useMemo, useState } from 'react'

interface TeamOption {
  id: string
  nom: string
  team_type?: string
}

interface PlayerOption {
  id: string
  name: string
  number: number
}

interface SaisonOption {
  id: string
  nom: string
}

type TransferType = 'PERMANENT' | 'LOAN' | 'LOAN_RETURN' | 'FREE_TRANSFER'

const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  PERMANENT: 'Transfert définitif',
  LOAN: 'Prêt',
  LOAN_RETURN: 'Retour de prêt',
  FREE_TRANSFER: 'Transfert libre',
}

interface TransferResult {
  id: string
  status: string
  warning?: string
}

const emptyForm = {
  from_team_id: '',
  to_team_id: '',
  player_id: '',
  transfer_type: 'PERMANENT' as TransferType,
  effective_date: '',
  season_id: '',
  fee: '',
  currency: '',
  loan_start_date: '',
  loan_end_date: '',
  notes: '',
}

/**
 * migration.md §19-23, Phase 3 : module central de transfert/homologation.
 * v1 simplifiée (autorisée par §19) — create + complete enchaînés côté
 * `POST /api/admin/player-transfers`, pas de workflow de validation à deux
 * clubs. Pas d'historique/tableau de bord ici : aucune route `GET` de
 * listing n'existe encore côté `teamManager` (reste ouvert, voir
 * migration.md Phase 3).
 */
export default function AdminPlayerTransfersManager() {
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [saisons, setSaisons] = useState<SaisonOption[]>([])
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TransferResult | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [teamsRes, saisonsRes] = await Promise.all([
          fetch('/api/admin/teams', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/admin/saisons', { cache: 'no-store', credentials: 'include' }),
        ])
        if (teamsRes.ok) setTeams(await teamsRes.json())
        if (saisonsRes.ok) setSaisons(await saisonsRes.json())
      } catch {
        setError('Erreur lors du chargement des clubs/saisons')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!form.from_team_id) {
      setPlayers([])
      return
    }
    let cancelled = false
    setLoadingPlayers(true)
    fetch(`/api/admin/teams/${form.from_team_id}/players`, { cache: 'no-store', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setPlayers(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingPlayers(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.from_team_id])

  const clubTeams = useMemo(() => teams.filter((t) => !t.team_type || t.team_type === 'club'), [teams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setResult(null)
    try {
      const body: Record<string, string> = {
        player_id: form.player_id,
        from_team_id: form.from_team_id,
        to_team_id: form.to_team_id,
        transfer_type: form.transfer_type,
        effective_date: form.effective_date,
      }
      if (form.season_id) body.season_id = form.season_id
      if (form.fee) body.fee = form.fee
      if (form.currency) body.currency = form.currency
      if (form.loan_start_date) body.loan_start_date = form.loan_start_date
      if (form.loan_end_date) body.loan_end_date = form.loan_end_date
      if (form.notes) body.notes = form.notes

      const response = await fetch('/api/admin/player-transfers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok && response.status !== 202) {
        throw new Error(data.error ?? 'Erreur lors de la création du transfert')
      }
      setResult({ id: data.id, status: data.status, warning: data.warning })
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="mb-1">Transferts</h2>
        <p className="text-muted mb-0">
          Homologuer un transfert de joueur entre deux clubs (migration.md §19-21). Le dossier est créé puis
          homologué immédiatement — v1 simplifiée, pas de workflow de validation à deux clubs.
        </p>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {result && (
        <div className={`alert ${result.warning ? 'alert-warning' : 'alert-success'} mb-0`}>
          Transfert {result.id} — statut {result.status}
          {result.warning && <div className="small mt-1">{result.warning}</div>}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : (
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Club source</label>
                <select
                  required
                  className="form-select"
                  value={form.from_team_id}
                  onChange={(e) => setForm({ ...form, from_team_id: e.target.value, player_id: '' })}
                >
                  <option value="">Sélectionner...</option>
                  {clubTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Club destination</label>
                <select
                  required
                  className="form-select"
                  value={form.to_team_id}
                  onChange={(e) => setForm({ ...form, to_team_id: e.target.value })}
                >
                  <option value="">Sélectionner...</option>
                  {clubTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Joueur</label>
                <select
                  required
                  className="form-select"
                  value={form.player_id}
                  onChange={(e) => setForm({ ...form, player_id: e.target.value })}
                  disabled={!form.from_team_id || loadingPlayers}
                >
                  <option value="">{loadingPlayers ? 'Chargement...' : 'Sélectionner...'}</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name}
                    </option>
                  ))}
                </select>
                {form.from_team_id && !loadingPlayers && players.length === 0 && (
                  <div className="form-text">Aucun joueur trouvé pour ce club.</div>
                )}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Type de transfert</label>
                <select
                  className="form-select"
                  value={form.transfer_type}
                  onChange={(e) => setForm({ ...form, transfer_type: e.target.value as TransferType })}
                >
                  {(Object.keys(TRANSFER_TYPE_LABELS) as TransferType[]).map((type) => (
                    <option key={type} value={type}>
                      {TRANSFER_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Date d&apos;effet</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={form.effective_date}
                  onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Saison (optionnel)</label>
                <select
                  className="form-select"
                  value={form.season_id}
                  onChange={(e) => setForm({ ...form, season_id: e.target.value })}
                >
                  <option value="">Aucune</option>
                  {saisons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Indemnité</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Devise</label>
                <input
                  type="text"
                  placeholder="TND"
                  className="form-control"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>

              {form.transfer_type === 'LOAN' && (
                <>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Début du prêt</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.loan_start_date}
                      onChange={(e) => setForm({ ...form, loan_start_date: e.target.value })}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Fin du prêt</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.loan_end_date}
                      onChange={(e) => setForm({ ...form, loan_end_date: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="col-12">
                <label className="form-label">Notes (optionnel)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="col-12 d-flex justify-content-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Homologation...' : 'Homologuer le transfert'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
