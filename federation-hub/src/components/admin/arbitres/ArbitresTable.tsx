'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Arbitre } from '@/types'
import { useTranslations } from '@/lib/i18n'

interface ArbitresTableProps {
  arbitres: Arbitre[]
  loading: boolean
  editingId: string | null
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  onStartEdit: (arbitre: Arbitre) => void
  onDelete: (id: string) => void
  onViewPhoto: (photoUrl: string | null) => void
}

export default function ArbitresTable({
  arbitres,
  loading,
  editingId,
  searchQuery,
  setSearchQuery,
  onStartEdit,
  onDelete,
  onViewPhoto,
}: ArbitresTableProps) {
  const { locale } = useTranslations()
  return (
    <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
      <div className="card">
        <div className="card-header bg-transparent">
          <h5 className="card-title mb-0">Arbitres ({arbitres.length})</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
            />
          </div>
          {loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nom</th>
                    <th>Nom (anglais)</th>
                    <th>Nom (arabe)</th>
                    <th>Naissance</th>
                    <th>Catégorie / grade</th>
                    <th>Statut</th>
                    <th>Photo</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitres.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-5">
                        {searchQuery.trim() ? 'Aucun arbitre trouvé pour cette recherche' : 'Aucun arbitre'}
                      </td>
                    </tr>
                  ) : (
                    arbitres.map((arbitre) => (
                      <tr
                        key={arbitre.id}
                        className={editingId === arbitre.id ? 'table-active' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onStartEdit(arbitre)}
                      >
                        <td className="fw-medium">{arbitre.nom}</td>
                        <td>{arbitre.nom_en || '—'}</td>
                        <td>{arbitre.nom_ar || '—'}</td>
                        <td>
                          {arbitre.date_naissance
                            ? new Date(arbitre.date_naissance).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-FR')
                            : '—'}
                        </td>
                        <td>{[arbitre.categorie, arbitre.grade].filter(Boolean).join(' · ') || '—'}</td>
                        <td>
                          <span className={`badge ${arbitre.is_active === false ? 'bg-secondary' : 'bg-success'}`}>
                            {arbitre.status || (arbitre.is_active === false ? 'INACTIVE' : 'ACTIVE')}
                          </span>
                        </td>
                        <td>
                          {arbitre.photo_url ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewPhoto(arbitre.photo_url || null)
                              }}
                              className="btn p-0 border-0 bg-transparent"
                            >
                              <img
                                src={arbitre.photo_url}
                                alt={arbitre.nom}
                                className="avatar-md rounded-circle"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML =
                                      '<div class="avatar-md"><span class="avatar-title rounded-circle bg-light text-muted fs-3"><i class="bx bx-user"></i></span></div>'
                                  }
                                }}
                              />
                            </button>
                          ) : (
                            <div className="avatar-md">
                              <span className="avatar-title rounded-circle bg-light text-muted fs-3">
                                <i className="bx bx-user" aria-hidden="true" />
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onStartEdit(arbitre)
                              }}
                              className={`btn btn-sm ${editingId === arbitre.id ? 'btn-primary' : 'btn-outline-primary'}`}
                            >
                              {editingId === arbitre.id ? 'En cours...' : 'Modifier'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete(arbitre.id)
                              }}
                              className="btn btn-sm btn-outline-danger"
                            >
                              Désactiver
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
