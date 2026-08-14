'use client'

import type { Federation, League, Saison } from '@/types'
import { useTranslations } from '@/lib/i18n'

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
  const { locale } = useTranslations()
  return (
    <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
      <div className="card">
        <div className="card-header bg-transparent">
          <h5 className="card-title mb-0">Saisons ({saisons.length})</h5>
        </div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6 col-lg-3">
              <input
                type="text"
                placeholder="Rechercher par nom ou ligue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="col-6 col-lg-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="form-select"
              >
                <option value="">Tous les types</option>
                <option value="championnat">Championnat</option>
                <option value="coupe">Coupe</option>
                <option value="tournois">Tournois</option>
              </select>
            </div>
            <div className="col-6 col-lg-3">
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
            <div className="col-6 col-lg-3">
              <select
                value={filterLeagueId}
                onChange={(e) => setFilterLeagueId(e.target.value)}
                className="form-select"
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
          {loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Ligue</th>
                    <th>Date début</th>
                    <th>Date fin</th>
                    <th>Contrat requis</th>
                    <th>Qualification staff</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {saisons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-5">
                        {searchQuery.trim()
                          ? 'Aucune saison trouvée pour cette recherche'
                          : 'Aucune saison'}
                      </td>
                    </tr>
                  ) : (
                    saisons.map((saison) => (
                      <tr
                        key={saison.id}
                        className={editingId === saison.id ? 'table-active' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onStartEdit(saison)}
                      >
                        <td className="fw-medium">{saison.nom}</td>
                        <td>
                          <span
                            className={`badge rounded-pill ${
                              saison.type_competition === 'coupe'
                                ? 'bg-info-subtle text-info'
                                : saison.type_competition === 'tournois'
                                  ? 'bg-warning-subtle text-warning'
                                  : 'bg-primary-subtle text-primary'
                            }`}
                          >
                            {saison.type_competition === 'coupe'
                              ? 'Coupe'
                              : saison.type_competition === 'tournois'
                                ? 'Tournois'
                                : 'Championnat'}
                          </span>
                        </td>
                        <td>{saison.league?.nom || '—'}</td>
                        <td>
                          {saison.date_debut
                            ? new Date(saison.date_debut).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-FR')
                            : '—'}
                        </td>
                        <td>
                          {saison.date_fin
                            ? new Date(saison.date_fin).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-FR')
                            : '—'}
                        </td>
                        <td><span className={`badge ${saison.requiresPlayerContract ? 'bg-success-subtle text-success' : 'bg-light text-muted'}`}>{saison.requiresPlayerContract ? 'Oui' : 'Non'}</span></td>
                        <td><span className={`badge ${saison.requiresStaffQualification ? 'bg-success-subtle text-success' : 'bg-light text-muted'}`}>{saison.requiresStaffQualification ? 'Oui' : 'Non'}</span></td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
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
      </div>
    </div>
  )
}
