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
    <div
      className={`${
        editingId ? 'col-span-12 md:col-span-8' : 'col-span-12'
      } bg-white shadow rounded-lg p-5`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Journées ({journees.length})</h3>
      </div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher par nom ou saison..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
          />
        </div>
        <div className="sm:w-72">
          <select
            value={filterSaisonId}
            onChange={(e) => setFilterSaisonId(e.target.value)}
            className="form-control"
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
        <p>Chargement...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-nowrap align-middle mb-0">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="p-2 font-semibold">N°</th>
                <th className="p-2 font-semibold">Nom (FR)</th>
                <th className="p-2 font-semibold">Nom (EN)</th>
                <th className="p-2 font-semibold">Nom (AR)</th>
                <th className="p-2 font-semibold">Fédération</th>
                <th className="p-2 font-semibold">Saison</th>
                <th className="p-2 font-semibold">Date</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {journees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
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
                      className={`border-b last:border-0 transition-colors cursor-pointer ${
                        editingId === journee.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => onStartEdit(journee)}
                    >
                      <td className="p-3 font-medium text-center">
                        {journee.numero !== null && journee.numero !== undefined ? journee.numero : '—'}
                      </td>
                      <td className="p-3">
                        {journee.nom_fr || '—'}
                      </td>
                      <td className="p-3 text-gray-600">
                        {journee.nom_en || '—'}
                      </td>
                      <td className="p-3 text-gray-600" dir="rtl">
                        {journee.nom_ar || '—'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {federationDisplay}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {saisonDisplay}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">
                        {journee.date_journee
                          ? new Date(journee.date_journee).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
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
  )
}
