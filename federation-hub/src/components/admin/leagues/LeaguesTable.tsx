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
    <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
      <div className="card">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-8">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="col-12 col-sm-4">
              <select
                value={filterFederationId}
                onChange={(e) => setFilterFederationId(e.target.value)}
                className="form-select"
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
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Logo</th>
                  <th>Fédération</th>
                  <th>Nom</th>
                  <th>Statut</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leagues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-5">
                      Aucune ligue trouvée
                    </td>
                  </tr>
                ) : (
                  leagues.map((league) => (
                    <tr key={league.id} className={editingId === league.id ? 'table-active' : undefined}>
                      <td>
                        {league.logo_url && !imageErrors.has(league.id) ? (
                          <button
                            type="button"
                            onClick={() => onViewLogo(league.logo_url || null)}
                            className="avatar-xs rounded border p-0 overflow-hidden"
                          >
                            <img
                              src={league.logo_url}
                              alt={league.nom}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                              onError={() => {
                                onImageError(league.id)
                              }}
                            />
                          </button>
                        ) : (
                          <div className="avatar-xs">
                            <span className="avatar-title rounded bg-light text-muted fs-6">
                              {league.nom.charAt(0).toUpperCase() || '—'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        {league.federation ? `${league.federation.code} - ${league.federation.nom}` : '—'}
                      </td>
                      <td className="fw-medium">{league.nom}</td>
                      <td>
                        {(() => {
                          const federation = federations.find((f) => f.id === league.federation_id)
                          const isFederationActive = federation?.is_active !== false
                          const isLeagueActive = league.is_active ?? true
                          // On peut toujours désactiver. On peut activer seulement si la fédération est active
                          // Le switch est toujours activable, mais on vérifie dans onChange si on peut activer

                          return (
                            <div className="form-check form-switch">
                              <input
                                type="checkbox"
                                role="switch"
                                checked={isLeagueActive}
                                onChange={(e) => onToggleActive(e, league)}
                                className="form-check-input"
                                id={`league-active-${league.id}`}
                              />
                              <label className="form-check-label" htmlFor={`league-active-${league.id}`}>
                                {isLeagueActive ? 'Active' : 'Inactive'}
                                {!isFederationActive && (
                                  <span className="text-warning small ms-1">(Fédération inactive)</span>
                                )}
                              </label>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
