'use client'

import React, { useEffect, useMemo, useState } from 'react'
import MatchOfficialsPanel from './matches/MatchOfficialsPanel'

interface Federation {
  id: string
  nom: string
}

interface MatchRow {
  id: string
  date: string | null
  status: string
  equipe_home: { id: string; nom: string } | null
  equipe_away: { id: string; nom: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'À venir',
  IN_PROGRESS: 'En cours',
  FINISHED: 'Terminé',
  CANCELLED: 'Annulé',
}

/**
 * migration.md §11, Phase 4 : écran "officiels de match" dédié à un
 * FEDERATION_ADMIN — contrairement au panneau `MatchOfficialsPanel`
 * intégré au gros écran générique `/admin/matches` (réservé
 * PLATFORM_SUPERADMIN), celui-ci liste uniquement les matchs RÉELLEMENT
 * gouvernés par la fédération sélectionnée (`GET
 * /api/admin/federations/:id/matches`) et réutilise le même panneau
 * d'affectation/révocation par match, déjà correctement scopé côté API.
 */
export default function AdminFederationMatchOfficialsManager({
  isPlatform,
  ownFederationId,
}: {
  isPlatform: boolean
  ownFederationId: string | null
}) {
  const [federations, setFederations] = useState<Federation[]>([])
  const [selectedFederationId, setSelectedFederationId] = useState<string>(ownFederationId ?? '')
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isPlatform) return
    fetch('/api/admin/federations', { cache: 'no-store', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Federation[]) => {
        setFederations(data)
        setSelectedFederationId((current) => current || data[0]?.id || '')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMatches(federationId: string) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/federations/${federationId}/matches`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Chargement des matchs impossible')
      setMatches(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedFederationId) loadMatches(selectedFederationId)
  }, [selectedFederationId])

  const sortedMatches = useMemo(() => matches, [matches])

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="mb-1">Officiels de match</h2>
        <p className="text-muted mb-0">
          Affectation/révocation d&apos;officiels sur les matchs de votre fédération (migration.md §11).
        </p>
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

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {!selectedFederationId ? (
            <p className="text-muted mb-0">Aucune fédération disponible.</p>
          ) : loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : sortedMatches.length === 0 ? (
            <p className="text-muted mb-0">Aucun match trouvé pour cette fédération.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Match</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMatches.map((match) => {
                    const isExpanded = expandedId === match.id
                    return (
                      <React.Fragment key={match.id}>
                        <tr>
                          <td>
                            {(match.equipe_home?.nom ?? '?')} vs {(match.equipe_away?.nom ?? '?')}
                          </td>
                          <td className="text-muted small">
                            {match.date ? new Date(match.date).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td>{STATUS_LABELS[match.status] ?? match.status}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className={`btn btn-sm ${isExpanded ? 'btn-secondary' : 'btn-outline-secondary'}`}
                              onClick={() => setExpandedId(isExpanded ? null : match.id)}
                            >
                              Officiels {isExpanded ? '▲' : '▼'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="bg-light">
                              <MatchOfficialsPanel matchId={match.id} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
