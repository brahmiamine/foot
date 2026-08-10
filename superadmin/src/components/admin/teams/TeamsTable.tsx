'use client'

import type { AgeCategory, Gender, Sport, Team, TeamType } from '@/types'
import { AGE_CATEGORY_LABELS, GENDER_LABELS, getCountryLabel, SPORT_LABELS, TEAM_TYPE_LABELS } from './constants'

interface TeamsTableProps {
  teams: Team[]
  loading: boolean
  editingId: string | null
  deletingId: string | null
  searchQuery: string
  filterTeamType: TeamType | 'all'
  filterSport: Sport | 'all'
  filterAgeCategory: AgeCategory | 'all'
  filterGender: Gender | 'all'
  filterCountry: string
  onStartEdit: (team: Team) => void
  onDelete: (id: string) => void
}

export default function TeamsTable({
  teams,
  loading,
  editingId,
  deletingId,
  searchQuery,
  filterTeamType,
  filterSport,
  filterAgeCategory,
  filterGender,
  filterCountry,
  onStartEdit,
  onDelete,
}: TeamsTableProps) {
  return (
    <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
      <div className="card">
        <div className="card-header bg-transparent">
          <h5 className="card-title mb-0">Équipes ({teams.length})</h5>
        </div>
        <div className="card-body">
          {loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Logo</th>
                    <th>Nom</th>
                    <th>Abbr</th>
                    <th>Type</th>
                    <th>Pays</th>
                    <th>Sport</th>
                    <th>Catégorie</th>
                    <th>Genre</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-5">
                        {searchQuery.trim() || filterTeamType !== 'all' || filterSport !== 'all' || filterAgeCategory !== 'all' || filterGender !== 'all' || filterCountry !== 'all'
                          ? 'Aucune équipe trouvée pour ces filtres'
                          : 'Aucune équipe'}
                      </td>
                    </tr>
                  ) : (
                    teams.map((team) => (
                      <tr
                        key={team.id}
                        className={editingId === team.id ? 'table-active' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onStartEdit(team)}
                      >
                        <td>
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.nom}
                              className="avatar-xs rounded"
                              style={{ objectFit: 'contain' }}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="avatar-xs">
                              <span className="avatar-title rounded bg-light text-muted fs-6">
                                {team.abbr || '—'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="fw-medium">{team.nom}</td>
                        <td className="font-monospace small">{team.abbr || '—'}</td>
                        <td>
                          <span className={`badge rounded-pill ${team.team_type === 'national' ? 'bg-primary-subtle text-primary' : 'bg-info-subtle text-info'}`}>
                            {TEAM_TYPE_LABELS[team.team_type || 'club']}
                          </span>
                        </td>
                        <td>{getCountryLabel(team.country_code)}</td>
                        <td>{SPORT_LABELS[team.sport || 'football']}</td>
                        <td>{AGE_CATEGORY_LABELS[team.age_category || 'seniors']}</td>
                        <td>{GENDER_LABELS[team.gender || 'male']}</td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onStartEdit(team)
                              }}
                              className={`btn btn-sm ${editingId === team.id ? 'btn-primary' : 'btn-outline-primary'}`}
                            >
                              {editingId === team.id ? 'En cours...' : 'Modifier'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete(team.id)
                              }}
                              disabled={deletingId === team.id}
                              className="btn btn-sm btn-outline-danger"
                            >
                              {deletingId === team.id ? '...' : 'Supprimer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
