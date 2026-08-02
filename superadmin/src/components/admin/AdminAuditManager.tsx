'use client'

import { useCallback, useEffect, useState } from 'react'

interface AuditLogEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  summary: string | null
  admin_username: string | null
  ip_address: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  login: 'Connexion',
  logout: 'Déconnexion',
  moderate: 'Modération',
  toggle: 'Activation/Désactivation',
  import: 'Import',
}

const PAGE_SIZE = 25

export default function AdminAuditManager() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(offset))
      const res = await fetch(`/api/admin/audit?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur chargement du journal')
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="d-flex flex-column gap-4">
      <header>
        <p className="text-muted small text-uppercase mb-1">Administration</p>
        <h1 className="mb-1">Journal d&apos;audit</h1>
        <p className="text-muted mb-0">{total} action(s) enregistrée(s)</p>
      </header>

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      <section className="card shadow-sm border-0">
        <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-nowrap align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Détail</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">Chargement...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">Aucune action enregistrée</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-muted">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="fw-medium">
                      {log.admin_username || '—'}
                    </td>
                    <td>
                      <span className="badge bg-soft-primary text-primary">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="text-muted">
                      {log.entity_type}
                      {log.entity_id && (
                        <span className="text-muted"> · {log.entity_id.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="text-muted">{log.summary || '—'}</td>
                    <td className="text-muted">{log.ip_address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>

        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between gap-3">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={currentPage <= 1 || loading}
              className="btn btn-sm btn-light border"
            >
              ← Précédent
            </button>
            <span className="text-muted small">Page {currentPage} sur {totalPages}</span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={currentPage >= totalPages || loading}
              className="btn btn-sm btn-light border"
            >
              Suivant →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
