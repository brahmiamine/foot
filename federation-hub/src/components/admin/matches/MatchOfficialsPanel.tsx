'use client'

import { useEffect, useState } from 'react'

interface MatchOfficialsPanelProps {
  matchId: string
}

interface OfficialAccount {
  id: string
  name: string
  email: string
  role: 'REFEREE' | 'MATCH_OFFICIAL' | 'REFEREE_OBSERVER'
  isActive: boolean
  unavailable: boolean
  unavailableFrom?: string | null
  unavailableTo?: string | null
  unavailableReason?: string | null
}

interface Arbitre {
  id: string
  nom: string
}

interface Assignment {
  id: number
  matchId: string
  userId: string
  role: string
  status: 'ACTIVE' | 'REVOKED'
  assignedBy?: string | null
}

type AssignmentRole = 'CENTER_REFEREE' | 'ASSISTANT_REFEREE' | 'FOURTH_OFFICIAL' | 'MATCH_DELEGATE' | 'REFEREE_OBSERVER' | 'TEAM_REPRESENTATIVE'

const ROLE_LABELS: Record<AssignmentRole, string> = {
  CENTER_REFEREE: 'Arbitre central',
  ASSISTANT_REFEREE: 'Arbitre assistant',
  FOURTH_OFFICIAL: 'Quatrième arbitre',
  MATCH_DELEGATE: 'Délégué de match',
  REFEREE_OBSERVER: "Observateur d'arbitres",
  TEAM_REPRESENTATIVE: "Représentant d'équipe",
}

/**
 * migration.md §11, Phase 4 : identité officielle de match
 * (`match_official_assignments`), affectée/révoquée ici via les routes
 * service-à-service `federation-hub` → `match-operations` — jamais d'écriture directe
 * sur cette table depuis `federation-hub`.
 */
export default function MatchOfficialsPanel({ matchId }: MatchOfficialsPanelProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [officials, setOfficials] = useState<OfficialAccount[]>([])
  const [arbitres, setArbitres] = useState<Arbitre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({ user_id: '', role: 'CENTER_REFEREE' as AssignmentRole, referee_id: '' })
  const [saving, setSaving] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [assignmentsRes, officialsRes, arbitresRes] = await Promise.all([
        fetch(`/api/admin/matches/${matchId}/officials`, { cache: 'no-store', credentials: 'include' }),
        fetch(`/api/admin/officials?matchId=${encodeURIComponent(matchId)}`, { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/arbitres', { cache: 'no-store', credentials: 'include' }),
      ])
      if (!assignmentsRes.ok) throw new Error('Chargement des officiels impossible')
      setAssignments(await assignmentsRes.json())
      if (officialsRes.ok) setOfficials(await officialsRes.json())
      if (arbitresRes.ok) setArbitres(await arbitresRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  const officialLabel = (userId: string) => {
    const account = officials.find((o) => o.id === userId)
    return account ? `${account.name} (${account.email})` : userId
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/matches/${matchId}/officials`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: form.user_id, role: form.role, referee_id: form.referee_id || null }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? "Erreur lors de l'affectation")
      setForm({ user_id: '', role: 'CENTER_REFEREE', referee_id: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(assignment: Assignment) {
    setRevokingId(assignment.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/matches/${matchId}/officials/${assignment.id}/revoke`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la révocation')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setRevokingId(null)
    }
  }

  if (loading) return <p className="text-muted small mb-0">Chargement des officiels...</p>

  const unavailableOfficials = officials.filter((official) => official.unavailable)

  return (
    <div className="d-flex flex-column gap-3">
      {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}

      {unavailableOfficials.length > 0 && (
        <div className="alert alert-warning mb-0">
          <div className="fw-semibold mb-1">Arbitres indisponibles pour ce match</div>
          <ul className="mb-0 ps-3 small">
            {unavailableOfficials.map((official) => (
              <li key={official.id}>
                {official.name} — du {official.unavailableFrom} au {official.unavailableTo}
                {official.unavailableReason ? ` (${official.unavailableReason})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {assignments.length === 0 ? (
        <p className="text-muted small mb-0">Aucun officiel affecté à ce match.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Officiel</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{officialLabel(assignment.userId)}</td>
                  <td>{ROLE_LABELS[assignment.role as AssignmentRole] ?? assignment.role}</td>
                  <td>
                    <span className={`badge ${assignment.status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                      {assignment.status === 'ACTIVE' ? 'Active' : 'Révoquée'}
                    </span>
                  </td>
                  <td className="text-end">
                    {assignment.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={revokingId === assignment.id}
                        onClick={() => handleRevoke(assignment)}
                      >
                        {revokingId === assignment.id ? 'Révocation...' : 'Révoquer'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAssign} className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1">Officiel (compte SSO)</label>
          <select
            required
            className="form-select form-select-sm"
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          >
            <option value="">Sélectionner...</option>
            {officials.map((o) => (
              <option key={o.id} value={o.id} disabled={!o.isActive || o.unavailable}>
                {o.name} ({o.email}){!o.isActive ? ' — désactivé' : o.unavailable ? ' — indisponible' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1">Rôle</label>
          <select
            className="form-select form-select-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as AssignmentRole })}
          >
            {(Object.keys(ROLE_LABELS) as AssignmentRole[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label small mb-1">Arbitre lié (optionnel)</label>
          <select
            className="form-select form-select-sm"
            value={form.referee_id}
            onChange={(e) => setForm({ ...form, referee_id: e.target.value })}
          >
            <option value="">Aucun</option>
            {arbitres.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-1">
          <button type="submit" className="btn btn-sm btn-primary w-100" disabled={saving || !form.user_id}>
            {saving ? '...' : 'Affecter'}
          </button>
        </div>
      </form>
    </div>
  )
}
