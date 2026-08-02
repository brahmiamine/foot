'use client'

import type { Federation, League, Saison } from '@/types'

interface SaisonsTableProps {
  saisons: Saison[]
  federations: Federation[]
  filteredLeagues: League[]
  loading: boolean
  editingId: string | null
  deletingId: string | null
  searchQuery: string
  setSearchQuery: (value: string) => void
  filterType: string
  setFilterType: (value: string) => void
  filterFederationId: string
  setFilterFederationId: (value: string) => void
  filterLeagueId: string
  setFilterLeagueId: (value: string) => void
  onStartEdit: (saison: Saison) => void
  onDelete: (id: string) => void
}

export default function SaisonsTable({
  saisons,
  federations,
  filteredLeagues,
  loading,
  editingId,
  deletingId,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterFederationId,
  setFilterFederationId,
  filterLeagueId,
  setFilterLeagueId,
  onStartEdit,
  onDelete,
}: SaisonsTableProps) {
  return (
    <div
      className={`${
        editingId ? 'col-span-12 md:col-span-8' : 'col-span-12'
      } bg-white shadow rounded-lg p-5`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Saisons ({saisons.length})</h3>
      </div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par nom ou ligue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="form-control"
            >
              <option value="">Tous les types</option>
              <option value="championnat">Championnat</option>
              <option value="coupe">Coupe</option>
              <option value="tournois">Tournois</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <select
              value={filterFederationId}
              onChange={(e) => setFilterFederationId(e.target.value)}
              className="form-control"
            >
              <option value="">Toutes les fédérations</option>
              {federations.map((fed) => (
                <option key={fed.id} value={fed.id}>
                  {fed.code} - {fed.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={filterLeagueId}
              onChange={(e) => setFilterLeagueId(e.target.value)}
              className="form-control"
            >
              <option value="">Toutes les ligues</option>
              {filteredLeagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-nowrap align-middle mb-0">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Nom</th>
                <th className="p-2">Type</th>
                <th className="p-2">Ligue</th>
                <th className="p-2">Date début</th>
                <th className="p-2">Date fin</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {saisons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    {searchQuery.trim()
                      ? 'Aucune saison trouvée pour cette recherche'
                      : 'Aucune saison'}
                  </td>
                </tr>
              ) : (
                saisons.map((saison) => (
                  <tr
                    key={saison.id}
                    className={`border-b last:border-0 transition-colors cursor-pointer ${
                      editingId === saison.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onStartEdit(saison)}
                  >
                    <td className="p-3 font-medium">{saison.nom}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          saison.type_competition === 'coupe'
                            ? 'bg-purple-100 text-purple-800'
                            : saison.type_competition === 'tournois'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {saison.type_competition === 'coupe' ? 'Coupe' : saison.type_competition === 'tournois' ? 'Tournois' : 'Championnat'}
                      </span>
                    </td>
                    <td className="p-3">{saison.league?.nom || '—'}</td>
                    <td className="p-3">
                      {saison.date_debut
                        ? new Date(saison.date_debut).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="p-3">
                      {saison.date_fin
                        ? new Date(saison.date_fin).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartEdit(saison)
                          }}
                          className={`btn btn-sm ${editingId === saison.id ? 'btn-primary' : 'btn-outline-primary'}`}
                        >
                          {editingId === saison.id ? 'En cours...' : 'Modifier'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(saison.id)
                          }}
                          disabled={deletingId === saison.id}
                          className="btn btn-sm btn-outline-danger"
                        >
                          {deletingId === saison.id ? 'Suppression...' : 'Supprimer'}
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
