'use client'

import React, { useState } from 'react'
import type { Arbitre, Match, Team } from '@/types'
import { getJourneeDisplayName } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { buildEdit } from './utils'
import type { MatchEdit } from './types'
import MatchFactsTimeline from './MatchFactsTimeline'
import MatchOfficialsPanel from './MatchOfficialsPanel'
import type { MatchFact } from '@/lib/dataAccess/matchFacts'

interface MatchesTableProps {
  loading: boolean
  sortedMatches: Match[]
  edits: Record<string, MatchEdit>
  teams: Team[]
  arbitres: Arbitre[]
  locale: Locale
  savingId: string | null
  deletingId: string | null
  cancelingId: string | null
  reopeningId: string | null
  updateEdit: (matchId: string, field: keyof MatchEdit, value: string) => void
  hasChanges: (match: Match) => boolean
  handleSave: (match: Match) => void
  handleDelete: (match: Match) => void
  handleCancel: (match: Match) => void
  handleReopen: (match: Match) => void
}

export default function MatchesTable({
  loading,
  sortedMatches,
  edits,
  teams,
  arbitres,
  locale,
  savingId,
  deletingId,
  cancelingId,
  reopeningId,
  updateEdit,
  hasChanges,
  handleSave,
  handleDelete,
  handleCancel,
  handleReopen,
}: MatchesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [factsByMatch, setFactsByMatch] = useState<Record<string, MatchFact[]>>({})
  const [loadingFactsId, setLoadingFactsId] = useState<string | null>(null)
  const [factsError, setFactsError] = useState<string | null>(null)
  const [expandedOfficialsId, setExpandedOfficialsId] = useState<string | null>(null)

  const toggleFacts = async (matchId: string) => {
    if (expandedId === matchId) {
      setExpandedId(null)
      return
    }
    setExpandedId(matchId)
    setFactsError(null)
    if (factsByMatch[matchId]) return
    setLoadingFactsId(matchId)
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/facts`)
      if (!res.ok) throw new Error('Erreur de chargement des faits de match')
      const data = await res.json()
      setFactsByMatch((prev) => ({ ...prev, [matchId]: data.facts ?? [] }))
    } catch {
      setFactsError("Impossible de charger les faits de ce match.")
    } finally {
      setLoadingFactsId(null)
    }
  }

  const toggleOfficials = (matchId: string) => {
    setExpandedOfficialsId((current) => (current === matchId ? null : matchId))
  }

  if (loading) {
    return <p className="text-muted mb-0">Chargement...</p>
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Match</th>
            <th>Journée</th>
            <th>Date</th>
            <th>Score</th>
            <th>Arbitre</th>
            <th>Statut</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedMatches.map((match) => {
            const edit = edits[match.id] ?? buildEdit(match)
            const changed = hasChanges(match)
            const isExpanded = expandedId === match.id
            const isOfficialsExpanded = expandedOfficialsId === match.id
            return (
              <React.Fragment key={match.id}>
              <tr>
                <td>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <div className="d-flex align-items-center gap-2 flex-fill">
                        {(() => {
                          const selectedHomeTeam = teams.find(t => t.id === edit.equipe_home)
                          return selectedHomeTeam?.logo_url ? (
                            <img
                              src={selectedHomeTeam.logo_url}
                              alt={selectedHomeTeam.nom}
                              className="avatar-xs rounded"
                              style={{ objectFit: 'contain' }}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="avatar-xs">
                              <span className="avatar-title rounded bg-light text-muted fs-6">
                                {selectedHomeTeam?.nom.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )
                        })()}
                        <select
                          value={edit.equipe_home}
                          onChange={(e) => updateEdit(match.id, 'equipe_home', e.target.value)}
                          className="form-select form-select-sm flex-fill"
                        >
                          <option value="">Sélectionner...</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-muted small">vs</span>
                      <div className="d-flex align-items-center gap-2 flex-fill">
                        {(() => {
                          const selectedAwayTeam = teams.find(t => t.id === edit.equipe_away)
                          return selectedAwayTeam?.logo_url ? (
                            <img
                              src={selectedAwayTeam.logo_url}
                              alt={selectedAwayTeam.nom}
                              className="avatar-xs rounded"
                              style={{ objectFit: 'contain' }}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="avatar-xs">
                              <span className="avatar-title rounded bg-light text-muted fs-6">
                                {selectedAwayTeam?.nom.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )
                        })()}
                        <select
                          value={edit.equipe_away}
                          onChange={(e) => updateEdit(match.id, 'equipe_away', e.target.value)}
                          className="form-select form-select-sm flex-fill"
                        >
                          <option value="">Sélectionner...</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="text-muted small font-monospace text-truncate">{match.id}</div>
                  </div>
                </td>
                <td>
                  {match.journee ? (
                    <div>
                      <div className="fw-medium">
                        {getJourneeDisplayName(match.journee, locale)}
                      </div>
                      {match.journee.date_journee && (
                        <div className="text-muted small">
                          {new Date(match.journee.date_journee).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-FR')}
                        </div>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={edit.date}
                    onChange={(e) => updateEdit(match.id, 'date', e.target.value)}
                    className="form-control form-control-sm"
                  />
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      className="form-control form-control-sm"
                      value={edit.score_home}
                      onChange={(e) => updateEdit(match.id, 'score_home', e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-muted">-</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      className="form-control form-control-sm"
                      value={edit.score_away}
                      onChange={(e) => updateEdit(match.id, 'score_away', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <select
                      value={edit.arbitre_id}
                      onChange={(e) => updateEdit(match.id, 'arbitre_id', e.target.value)}
                      className="form-select form-select-sm flex-fill"
                    >
                      <option value="">Aucun arbitre</option>
                      {arbitres.map((arbitre) => (
                        <option key={arbitre.id} value={arbitre.id}>
                          {arbitre.nom}
                        </option>
                      ))}
                    </select>
                    {edit.arbitre_id && (
                      <button
                        type="button"
                        onClick={() => updateEdit(match.id, 'arbitre_id', '')}
                        className="btn btn-sm btn-outline-danger"
                        title="Supprimer l'arbitre"
                      >
                        <i className="bx bx-x" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  {(() => {
                    const status = match.status ?? 'UPCOMING'
                    const badgeClass =
                      status === 'CANCELLED'
                        ? 'bg-danger-subtle text-danger'
                        : status === 'FINISHED'
                          ? 'bg-secondary-subtle text-secondary'
                          : status === 'IN_PROGRESS'
                            ? 'bg-success-subtle text-success'
                            : 'bg-light text-muted'
                    const statusLabel = { UPCOMING: 'À venir', IN_PROGRESS: 'En cours', FINISHED: 'Terminé', CANCELLED: 'Annulé' }[status]
                    return <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                  })()}
                </td>
                <td className="text-end">
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      className={`btn btn-sm ${isExpanded ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleFacts(match.id)}
                    >
                      Faits {isExpanded ? '▲' : '▼'}
                    </button>
                    <button
                      className={`btn btn-sm ${isOfficialsExpanded ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleOfficials(match.id)}
                    >
                      Officiels {isOfficialsExpanded ? '▲' : '▼'}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={!changed || savingId === match.id || match.status === 'CANCELLED'}
                      onClick={() => handleSave(match)}
                    >
                      {savingId === match.id ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                          Sauvegarde...
                        </>
                      ) : (
                        'Sauvegarder'
                      )}
                    </button>
                    {(!match.status || match.status === 'UPCOMING') && (
                      <button
                        className="btn btn-sm btn-outline-warning"
                        disabled={cancelingId === match.id}
                        onClick={() => handleCancel(match)}
                      >
                        {cancelingId === match.id ? 'Annulation...' : 'Annuler'}
                      </button>
                    )}
                    {match.status === 'FINISHED' && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={reopeningId === match.id}
                        onClick={() => handleReopen(match)}
                      >
                        {reopeningId === match.id ? 'Réouverture...' : 'Rouvrir'}
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={deletingId === match.id || savingId === match.id}
                      onClick={() => handleDelete(match)}
                    >
                      {deletingId === match.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </td>
              </tr>
              {isExpanded && (
                <tr>
                  <td colSpan={7} className="bg-light">
                    {loadingFactsId === match.id ? (
                      <p className="text-muted small mb-0">Chargement des faits de match...</p>
                    ) : factsError ? (
                      <p className="text-danger small mb-0">{factsError}</p>
                    ) : (
                      <MatchFactsTimeline facts={factsByMatch[match.id] ?? []} />
                    )}
                  </td>
                </tr>
              )}
              {isOfficialsExpanded && (
                <tr>
                  <td colSpan={7} className="bg-light">
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
  )
}
