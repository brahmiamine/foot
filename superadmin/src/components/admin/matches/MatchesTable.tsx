'use client'

import type { Arbitre, Match, Team } from '@/types'
import { getJourneeDisplayName } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { buildEdit } from './utils'
import type { MatchEdit } from './types'

interface MatchesTableProps {
  loading: boolean
  sortedMatches: Match[]
  edits: Record<string, MatchEdit>
  teams: Team[]
  arbitres: Arbitre[]
  locale: Locale
  savingId: string | null
  deletingId: string | null
  updateEdit: (matchId: string, field: keyof MatchEdit, value: string) => void
  hasChanges: (match: Match) => boolean
  handleSave: (match: Match) => void
  handleDelete: (match: Match) => void
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
  updateEdit,
  hasChanges,
  handleSave,
  handleDelete,
}: MatchesTableProps) {
  if (loading) {
    return <p>Chargement...</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-nowrap align-middle mb-0">
        <thead>
          <tr className="text-left border-b text-gray-500 uppercase text-xs tracking-wide">
            <th className="p-2">Match</th>
            <th className="p-2">Journée</th>
            <th className="p-2">Date</th>
            <th className="p-2">Score</th>
            <th className="p-2">Arbitre</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedMatches.map((match) => {
            const edit = edits[match.id] ?? buildEdit(match)
            const changed = hasChanges(match)
            return (
              <tr key={match.id} className="border-b last:border-0">
                <td className="p-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {(() => {
                          const selectedHomeTeam = teams.find(t => t.id === edit.equipe_home)
                          return selectedHomeTeam?.logo_url ? (
                            <img
                              src={selectedHomeTeam.logo_url}
                              alt={selectedHomeTeam.nom}
                              className="w-6 h-6 object-contain"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-semibold">
                              {selectedHomeTeam?.nom.charAt(0).toUpperCase() || '?'}
                            </div>
                          )
                        })()}
                        <select
                          value={edit.equipe_home}
                          onChange={(e) => updateEdit(match.id, 'equipe_home', e.target.value)}
                          className="form-select form-select-sm flex-1"
                        >
                          <option value="">Sélectionner...</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-gray-400 text-xs">vs</span>
                      <div className="flex items-center gap-2 flex-1">
                        {(() => {
                          const selectedAwayTeam = teams.find(t => t.id === edit.equipe_away)
                          return selectedAwayTeam?.logo_url ? (
                            <img
                              src={selectedAwayTeam.logo_url}
                              alt={selectedAwayTeam.nom}
                              className="w-6 h-6 object-contain"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-semibold">
                              {selectedAwayTeam?.nom.charAt(0).toUpperCase() || '?'}
                            </div>
                          )
                        })()}
                        <select
                          value={edit.equipe_away}
                          onChange={(e) => updateEdit(match.id, 'equipe_away', e.target.value)}
                          className="form-select form-select-sm flex-1"
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
                    <div className="text-xs text-gray-500 font-mono truncate">{match.id}</div>
                  </div>
                </td>
                <td className="p-2">
                  {match.journee ? (
                    <div>
                      <div className="font-medium">
                        {getJourneeDisplayName(match.journee, locale)}
                      </div>
                      {match.journee.date_journee && (
                        <div className="text-xs text-gray-500">
                          {new Date(match.journee.date_journee).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-2">
                  <input
                    type="datetime-local"
                    value={edit.date}
                    onChange={(e) => updateEdit(match.id, 'date', e.target.value)}
                    className="form-control form-control-sm"
                  />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
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
                    <span className="text-gray-500">-</span>
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
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={edit.arbitre_id}
                      onChange={(e) => updateEdit(match.id, 'arbitre_id', e.target.value)}
                      className="form-select form-select-sm flex-1"
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
                        ✕
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={!changed || savingId === match.id}
                      onClick={() => handleSave(match)}
                    >
                      {savingId === match.id ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
