'use client'

import { useEffect, useState } from 'react'

interface Federation {
  id: string
  nom: string
}

interface LeagueOption {
  id: string
  nom: string
  federation_id: string
}

type StaffRole = 'FEDERATION_ADMIN' | 'LEAGUE_ADMIN' | 'REFEREE' | 'MATCH_OFFICIAL' | 'REFEREE_OBSERVER'

interface InvitationSummary {
  id: string
  name: string
  email: string
  role: StaffRole
  federationId: string | null
  federationName: string | null
  leagueId: string | null
  leagueName: string | null
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
}

const ROLE_LABELS: Record<StaffRole, string> = {
  FEDERATION_ADMIN: 'Administrateur fédéral',
  LEAGUE_ADMIN: 'Administrateur de ligue',
  REFEREE: 'Arbitre',
  MATCH_OFFICIAL: 'Officiel de match',
  REFEREE_OBSERVER: "Observateur d'arbitres",
}

const STATUS_LABELS: Record<InvitationSummary['status'], { label: string; badge: string }> = {
  PENDING: { label: 'En attente', badge: 'bg-warning-subtle text-warning' },
  ACCEPTED: { label: 'Acceptée', badge: 'bg-success-subtle text-success' },
  EXPIRED: { label: 'Expirée', badge: 'bg-secondary-subtle text-secondary' },
}

function buildEmptyForm(defaultRole: StaffRole) {
  return { name: '', email: '', role: defaultRole, federation_id: '', league_id: '' }
}

/**
 * `isPlatform` distingue PLATFORM_SUPERADMIN (tous les rôles) d'un
 * FEDERATION_ADMIN (ne peut pas créer un autre FEDERATION_ADMIN — réservé
 * plateforme côté API, voir POST /api/admin/staff-invitations) : option
 * masquée plutôt que proposée puis rejetée en 403.
 */
export default function AdminStaffInvitationsManager({ isPlatform }: { isPlatform: boolean }) {
  const availableRoles = (Object.keys(ROLE_LABELS) as StaffRole[]).filter((role) => isPlatform || role !== 'FEDERATION_ADMIN')
  const emptyForm = buildEmptyForm(availableRoles[0])
  const [invitations, setInvitations] = useState<InvitationSummary[]>([])
  const [federations, setFederations] = useState<Federation[]>([])
  const [leagues, setLeagues] = useState<LeagueOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [invitationsRes, federationsRes, leaguesRes] = await Promise.all([
        fetch('/api/admin/staff-invitations', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/federations', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/leagues', { cache: 'no-store', credentials: 'include' }),
      ])
      if (!invitationsRes.ok) throw new Error('Erreur lors du chargement des invitations')
      setInvitations(await invitationsRes.json())
      if (federationsRes.ok) setFederations(await federationsRes.json())
      if (leaguesRes.ok) setLeagues(await leaguesRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role }
      if (form.role === 'FEDERATION_ADMIN') body.federation_id = form.federation_id
      if (form.role === 'LEAGUE_ADMIN') body.league_id = form.league_id

      const response = await fetch('/api/admin/staff-invitations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la création de l’invitation')

      setSuccess(`Invitation envoyée à ${form.email}`)
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Invitations staff</h2>
          <p className="text-muted mb-0">
            Provisionner des comptes Administrateur fédéral, Administrateur de ligue, Arbitre, Officiel de match ou
            Observateur d&apos;arbitres (migration.md §0).
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Annuler' : '+ Inviter'}
        </button>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {success && <div className="alert alert-success mb-0">{success}</div>}

      {showForm && (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">Nom</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Rôle</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole, federation_id: '', league_id: '' })}
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              {form.role === 'FEDERATION_ADMIN' && (
                <div className="col-12 col-md-6">
                  <label className="form-label">Fédération</label>
                  <select
                    required
                    className="form-select"
                    value={form.federation_id}
                    onChange={(e) => setForm({ ...form, federation_id: e.target.value })}
                  >
                    <option value="">Sélectionner...</option>
                    {federations.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.role === 'LEAGUE_ADMIN' && (
                <div className="col-12 col-md-6">
                  <label className="form-label">Ligue</label>
                  <select
                    required
                    className="form-select"
                    value={form.league_id}
                    onChange={(e) => setForm({ ...form, league_id: e.target.value })}
                  >
                    <option value="">Sélectionner...</option>
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(form.role === 'REFEREE' || form.role === 'MATCH_OFFICIAL' || form.role === 'REFEREE_OBSERVER') && (
                <div className="col-12">
                  <p className="text-muted small mb-0">
                    Ce rôle n&apos;a pas de périmètre fixé à la création du compte : l&apos;affectation réelle se fait
                    match par match (officiels) ou lors de la validation d&apos;une évaluation (observateurs).
                  </p>
                </div>
              )}

              <div className="col-12 d-flex justify-content-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Envoi...' : "Envoyer l'invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : invitations.length === 0 ? (
            <p className="text-muted mb-0">Aucune invitation envoyée pour l&apos;instant.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Périmètre</th>
                    <th>Statut</th>
                    <th>Envoyée le</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => {
                    const status = STATUS_LABELS[invitation.status]
                    const scope = invitation.federationName ?? invitation.leagueName ?? '—'
                    return (
                      <tr key={invitation.id}>
                        <td>{invitation.name}</td>
                        <td>{invitation.email}</td>
                        <td>{ROLE_LABELS[invitation.role]}</td>
                        <td>{scope}</td>
                        <td>
                          <span className={`badge ${status.badge}`}>{status.label}</span>
                        </td>
                        <td className="text-muted small">{new Date(invitation.createdAt).toLocaleDateString('fr-FR')}</td>
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
