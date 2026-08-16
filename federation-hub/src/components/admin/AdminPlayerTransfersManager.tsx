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

type TransferStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'

interface Transfer {
  id: string
  playerId: string
  fromTeamId: string
  toTeamId: string
  transferType: TransferType
  status: TransferStatus
  effectiveDate: string
  fee?: string | null
  currency?: string | null
  notes?: string | null
  statusReason?: string | null
  createdAt?: string
  fromTeamName: string | null
  toTeamName: string | null
  playerName: string | null
}

const STATUS_LABELS: Record<TransferStatus, { label: string; badge: string }> = {
  DRAFT: { label: 'Brouillon', badge: 'bg-secondary-subtle text-secondary' },
  PENDING: { label: 'En attente', badge: 'bg-warning-subtle text-warning' },
  APPROVED: { label: 'Approuvé', badge: 'bg-info-subtle text-info' },
  COMPLETED: { label: 'Complété', badge: 'bg-success-subtle text-success' },
  CANCELLED: { label: 'Annulé', badge: 'bg-secondary-subtle text-secondary' },
  REJECTED: { label: 'Rejeté', badge: 'bg-danger-subtle text-danger' },
}

type DashboardTab = 'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'LOAN' | 'CANCELLED'

const TAB_LABELS: Record<DashboardTab, string> = {
  ALL: 'Tous',
  PENDING: 'En attente',
  APPROVED: 'Approuvés',
  COMPLETED: 'Historique',
  LOAN: 'Prêts',
  CANCELLED: 'Annulés',
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
 * Tableau fédéral des transferts.
 *
 * Le workflow est multi-acteurs : création PENDING, approbation du club
 * destination, puis homologation fédérale explicite des dossiers APPROVED.
 * L'API reste la source d'autorité pour les scopes et les règles métier.
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
  const [homologatingId, setHomologatingId] = useState<string | null>(null)

  const [form, setForm] = useState(emptyForm)

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loadingTransfers, setLoadingTransfers] = useState(true)
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('ALL')

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
    loadTransfers()
  }, [])

  async function loadTransfers() {
    setLoadingTransfers(true)
    try {
      const response = await fetch('/api/admin/player-transfers', { cache: 'no-store', credentials: 'include' })
      if (response.ok) setTransfers(await response.json())
    } catch {
      // Le formulaire reste utilisable même si le tableau de bord échoue à charger.
    } finally {
      setLoadingTransfers(false)
    }
  }

  const filteredTransfers = useMemo(() => {
    if (dashboardTab === 'ALL') return transfers
    if (dashboardTab === 'LOAN') return transfers.filter((t) => t.transferType === 'LOAN')
    if (dashboardTab === 'CANCELLED') return transfers.filter((t) => t.status === 'CANCELLED' || t.status === 'REJECTED')
    return transfers.filter((t) => t.status === dashboardTab)
  }, [transfers, dashboardTab])

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
        season_id: form.season_id,
      }
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
      if (!response.ok) {
        throw new Error(data.error ?? 'Erreur lors de la création du transfert')
      }
      setResult({ id: data.id, status: data.status })
      setForm(emptyForm)
      await loadTransfers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleHomologate(transferId: string) {
    setHomologatingId(transferId)
    setError(null)
    setResult(null)
    try {
      const response = await fetch(`/api/admin/player-transfers/${transferId}/homologate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur lors de l'homologation du transfert")
      }
      setResult({ id: data.id ?? transferId, status: data.status ?? 'COMPLETED' })
      await loadTransfers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setHomologatingId(null)
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="mb-1">Transferts</h2>
        <p className="text-muted mb-0">
          Suivre le workflow complet : demande en attente, approbation du club destination, puis homologation
          fédérale. Une demande créée ici reste PENDING jusqu&apos;à l&apos;approbation du club destination.
        </p>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {result && (
        <div className={`alert ${result.warning ? 'alert-warning' : 'alert-success'} mb-0`}>
          Transfert {result.id} — statut {result.status}
          {result.status === 'PENDING' && (
            <div className="small mt-1">En attente de l&apos;approbation du club destination.</div>
          )}
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
                <label className="form-label">Saison</label>
                <select
                  required
                  className="form-select"
                  value={form.season_id}
                  onChange={(e) => setForm({ ...form, season_id: e.target.value })}
                >
                  <option value="">Sélectionner...</option>
                  {saisons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
                <div className="form-text">Obligatoire pour contrôler la fenêtre de transfert.</div>
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
                  {saving ? 'Création...' : 'Créer la demande'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h5 className="mb-0">Tableau de bord</h5>
            <div className="btn-group btn-group-sm" role="group">
              {(Object.keys(TAB_LABELS) as DashboardTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`btn ${dashboardTab === tab ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setDashboardTab(tab)}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          {loadingTransfers ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : filteredTransfers.length === 0 ? (
            <p className="text-muted mb-0">Aucun transfert dans cette catégorie.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Joueur</th>
                    <th>De</th>
                    <th>Vers</th>
                    <th>Type</th>
                    <th>Date d&apos;effet</th>
                    <th>Statut</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((t) => {
                    const status = STATUS_LABELS[t.status]
                    return (
                      <tr key={t.id}>
                        <td>{t.playerName ?? t.playerId}</td>
                        <td>{t.fromTeamName ?? t.fromTeamId}</td>
                        <td>{t.toTeamName ?? t.toTeamId}</td>
                        <td>{TRANSFER_TYPE_LABELS[t.transferType]}</td>
                        <td className="text-muted small">{t.effectiveDate}</td>
                        <td>
                          <span className={`badge ${status.badge}`}>{status.label}</span>
                          {t.statusReason && <div className="text-muted small">{t.statusReason}</div>}
                        </td>
                        <td className="text-end">
                          {t.status === 'APPROVED' ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              disabled={homologatingId === t.id}
                              onClick={() => handleHomologate(t.id)}
                            >
                              {homologatingId === t.id ? 'Homologation...' : 'Homologuer'}
                            </button>
                          ) : (
                            <span className="text-muted small">—</span>
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
