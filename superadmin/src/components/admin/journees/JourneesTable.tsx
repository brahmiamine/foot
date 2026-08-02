'use client'

import type { Journee, Saison } from '@/types'
import { getSaisonDisplayName } from './constants'

interface JourneesTableProps {
  journees: Journee[]
  saisons: Saison[]
  loading: boolean
  editingId: string | null
  deletingId: string | null
  searchQuery: string
  setSearchQuery: (value: string) => void
  filterSaisonId: string
  setFilterSaisonId: (value: string) => void
  onStartEdit: (journee: Journee) => void
  onDelete: (id: string) => void
}

export default function JourneesTable({
  journees,
  saisons,
  loading,
  editingId,
  deletingId,
  searchQuery,
  setSearchQuery,
  filterSaisonId,
  setFilterSaisonId,
  onStartEdit,
  onDelete,
}: JourneesTableProps) {
  return (
    <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
      <div className="card">
        <div className="card-header bg-transparent">
          <h5 className="card-title mb-0">Journées ({journees.length})</h5>
        </div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-8">
              <input
                type="text"
                placeholder="Rechercher par nom ou saison..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="col-12 col-sm-4">
              <select
                value={filterSaisonId}
                onChange={(e) => setFilterSaisonId(e.target.value)}
                className="form-select"
              >
                <option value="">Toutes les saisons</option>
                {saisons.map((saison) => (
                  <option key={saison.id} value={saison.id}>
                    {getSaisonDisplayName(saison)}
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
                    <th>N°</th>
                    <th>Nom (FR)</th>
                    <th>Nom (EN)</th>
                    <th>Nom (AR)</th>
                    <th>Fédération</th>
                    <th>Saison</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {journees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-5">
                        {searchQuery.trim() || filterSaisonId
                          ? 'Aucune journée trouvée pour ces critères'
                          : 'Aucune journée'}
                      </td>
                    </tr>
                  ) : (
                    journees.map((journee) => {
                      // Format saison comme dans les dropdowns: Ligue (Saison)
                      const saisonDisplay = journee.saison
                        ? `${journee.saison.league?.nom || 'Sans ligue'} (${journee.saison.nom})`
                        : '—'

                      // Fédération via saison -> league -> federation
                      const federationDisplay = journee.saison?.league?.federation?.nom || '—'

                      return (
                        <tr
                          key={journee.id}
                          className={editingId === journee.id ? 'table-active' : undefined}
                          style={{ cursor: 'pointer' }}
                          onClick={() => onStartEdit(journee)}
                        >
                          <td className="fw-medium text-center">
                            {journee.numero !== null && journee.numero !== undefined ? journee.numero : '—'}
                          </td>
                          <td>{journee.nom_fr || '—'}</td>
                          <td className="text-muted">{journee.nom_en || '—'}</td>
                          <td className="text-muted" dir="rtl">
                            {journee.nom_ar || '—'}
                          </td>
                          <td>
                            <span className="badge rounded-pill bg-success-subtle text-success">
                              {federationDisplay}
                            </span>
                          </td>
                          <td>
                            <span className="badge rounded-pill bg-primary-subtle text-primary">
                              {saisonDisplay}
                            </span>
                          </td>
                          <td className="text-muted">
                            {journee.date_journee
                              ? new Date(journee.date_journee).toLocaleDateString('fr-FR')
                              : '—'}
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-2 justify-content-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onStartEdit(journee)
                                }}
                                className={`btn btn-sm ${editingId === journee.id ? 'btn-primary' : 'btn-outline-primary'}`}
                              >
                                {editingId === journee.id ? 'En cours...' : 'Modifier'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(journee.id)
                                }}
                                disabled={deletingId === journee.id}
                                className="btn btn-sm btn-outline-danger"
                              >
                                {deletingId === journee.id ? 'Suppression...' : 'Supprimer'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
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
