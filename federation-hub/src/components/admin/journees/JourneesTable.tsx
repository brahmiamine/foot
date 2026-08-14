'use client'

import type { Journee, Saison } from '@/types'
import { useTranslations } from '@/lib/i18n'
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
  const { locale, t } = useTranslations()
  return (
    <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
      <div className="card">
        <div className="card-header bg-transparent">
          <h5 className="card-title mb-0">{t('admin.journees.listTitle', { count: journees.length })}</h5>
        </div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-8">
              <input
                type="text"
                placeholder={t('admin.journees.searchPlaceholder')}
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
                <option value="">{t('admin.journees.allSeasons')}</option>
                {saisons.map((saison) => (
                  <option key={saison.id} value={saison.id}>
                    {getSaisonDisplayName(saison)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <p className="text-muted mb-0">{t('admin.common.loading')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>N°</th>
                    <th>{t('admin.journees.nameFr')}</th>
                    <th>{t('admin.journees.nameEn')}</th>
                    <th>{t('admin.journees.nameAr')}</th>
                    <th>{t('admin.journees.federation')}</th>
                    <th>{t('admin.journees.season')}</th>
                    <th>{t('admin.journees.date')}</th>
                    <th className="text-end">{t('admin.common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {journees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-5">
                        {searchQuery.trim() || filterSaisonId
                          ? t('admin.journees.noResults')
                          : t('admin.journees.empty')}
                      </td>
                    </tr>
                  ) : (
                    journees.map((journee) => {
                      // Format saison comme dans les dropdowns: Ligue (Saison)
                      const saisonDisplay = journee.saison
                        ? `${journee.saison.league?.nom || t('admin.journees.noLeague')} (${journee.saison.nom})`
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
                              ? new Date(journee.date_journee).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-FR')
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
                                {editingId === journee.id ? t('admin.journees.editing') : t('admin.common.edit')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(journee.id)
                                }}
                                disabled={deletingId === journee.id}
                                className="btn btn-sm btn-outline-danger"
                              >
                                {deletingId === journee.id ? t('admin.common.deleting') : t('admin.common.delete')}
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
