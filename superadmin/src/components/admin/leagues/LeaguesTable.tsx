'use client'

import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { Federation, League } from './types'

interface LeaguesTableProps {
  leagues: League[]
  federations: Federation[]
  editingId: string | null
  imageErrors: Set<string>
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  filterFederationId: string
  setFilterFederationId: Dispatch<SetStateAction<string>>
  onViewLogo: (url: string | null) => void
  onImageError: (id: string) => void
  onStartEdit: (league: League) => void
  onDelete: (id: string) => void
  onToggleActive: (e: ChangeEvent<HTMLInputElement>, league: League) => void
}

export default function LeaguesTable({
  leagues,
  federations,
  editingId,
  imageErrors,
  searchQuery,
  setSearchQuery,
  filterFederationId,
  setFilterFederationId,
  onViewLogo,
  onImageError,
  onStartEdit,
  onDelete,
  onToggleActive,
}: LeaguesTableProps) {
  return (
    <div className={`${editingId ? 'col-span-12 md:col-span-8' : 'col-span-12'} bg-white shadow rounded-lg p-5`}>
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
          />
        </div>
        <div className="sm:w-64">
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
      </div>
      <div className="overflow-x-auto">
        <table className="table table-nowrap align-middle mb-0">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Logo</th>
              <th className="text-left py-2 px-2">Fédération</th>
              <th className="text-left py-2 px-2">Nom</th>
              <th className="text-left py-2 px-2">Statut</th>
              <th className="text-left py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leagues.map((league) => (
              <tr key={league.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2">
                  {league.logo_url && !imageErrors.has(league.id) ? (
                    <button
                      onClick={() => onViewLogo(league.logo_url || null)}
                      className="relative w-10 h-10 rounded overflow-hidden border bg-gray-100"
                    >
                      <img
                        src={league.logo_url}
                        alt={league.nom}
                        className="w-full h-full object-cover"
                        onError={() => {
                          onImageError(league.id)
                        }}
                      />
                    </button>
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-semibold">
                      {league.nom.charAt(0).toUpperCase() || '—'}
                    </div>
                  )}
                </td>
                <td className="py-2 px-2">
                  {league.federation ? `${league.federation.code} - ${league.federation.nom}` : '—'}
                </td>
                <td className="py-2 px-2">{league.nom}</td>
                <td className="py-2 px-2">
                  {(() => {
                    const federation = federations.find((f) => f.id === league.federation_id)
                    const isFederationActive = federation?.is_active !== false
                    const isLeagueActive = league.is_active ?? true
                    // On peut toujours désactiver. On peut activer seulement si la fédération est active
                    // Le switch est toujours activable, mais on vérifie dans onChange si on peut activer

                    return (
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isLeagueActive}
                          onChange={(e) => onToggleActive(e, league)}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {isLeagueActive ? 'Active' : 'Inactive'}
                          {!isFederationActive && (
                            <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                              (Fédération inactive)
                            </span>
                          )}
                        </span>
                      </label>
                    )
                  })()}
                </td>
                <td className="py-2 px-2 text-nowrap">
                  <div className="d-inline-flex gap-2">
                    <button
                      onClick={() => onStartEdit(league)}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => onDelete(league.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
