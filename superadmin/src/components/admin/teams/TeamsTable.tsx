'use client'

import type { AgeCategory, Sport, Team, TeamType } from '@/types'
import { AGE_CATEGORY_LABELS, getCountryLabel, SPORT_LABELS, TEAM_TYPE_LABELS } from './constants'

interface TeamsTableProps {
  teams: Team[]
  loading: boolean
  editingId: string | null
  deletingId: string | null
  searchQuery: string
  filterTeamType: TeamType | 'all'
  filterSport: Sport | 'all'
  filterAgeCategory: AgeCategory | 'all'
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
  filterCountry,
  onStartEdit,
  onDelete,
}: TeamsTableProps) {
  return (
    <div
      className={`${
        editingId ? 'col-span-12 lg:col-span-8' : 'col-span-12'
      } bg-white shadow rounded-lg p-5`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Équipes ({teams.length})</h3>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-nowrap align-middle mb-0">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Logo</th>
                <th className="p-2">Nom</th>
                <th className="p-2">Abbr</th>
                <th className="p-2">Type</th>
                <th className="p-2">Pays</th>
                <th className="p-2">Sport</th>
                <th className="p-2">Catégorie</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {searchQuery.trim() || filterTeamType !== 'all' || filterSport !== 'all' || filterAgeCategory !== 'all' || filterCountry !== 'all'
                      ? 'Aucune équipe trouvée pour ces filtres'
                      : 'Aucune équipe'}
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr
                    key={team.id}
                    className={`border-b last:border-0 transition-colors cursor-pointer ${
                      editingId === team.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onStartEdit(team)}
                  >
                    <td className="p-2">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.nom}
                          className="w-8 h-8 object-contain"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                          {team.abbr || '—'}
                        </div>
                      )}
                    </td>
                    <td className="p-2 font-medium">{team.nom}</td>
                    <td className="p-2 font-mono text-xs">{team.abbr || '—'}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          team.team_type === 'national'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {TEAM_TYPE_LABELS[team.team_type || 'club']}
                      </span>
                    </td>
                    <td className="p-2">{getCountryLabel(team.country_code)}</td>
                    <td className="p-2">{SPORT_LABELS[team.sport || 'football']}</td>
                    <td className="p-2">{AGE_CATEGORY_LABELS[team.age_category || 'seniors']}</td>
                    <td className="p-2 text-right">
                      <div className="flex gap-2 justify-end">
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
  )
}
