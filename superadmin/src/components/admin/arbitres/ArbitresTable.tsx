'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Arbitre } from '@/types'

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
  return (
    <div className={`${editingId ? 'col-span-12 md:col-span-8' : 'col-span-12'} bg-white shadow rounded-lg p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Arbitres ({arbitres.length})</h3>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher par nom..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-control"
        />
      </div>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-nowrap align-middle mb-0">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Nom</th>
                <th className="p-2">Nom (anglais)</th>
                <th className="p-2">Nom (arabe)</th>
                <th className="p-2">Naissance</th>
                <th className="p-2">Photo</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {arbitres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    {searchQuery.trim() ? 'Aucun arbitre trouvé pour cette recherche' : 'Aucun arbitre'}
                  </td>
                </tr>
              ) : (
                arbitres.map((arbitre) => (
                  <tr
                    key={arbitre.id}
                    className={`border-b last:border-0 transition-colors cursor-pointer ${
                      editingId === arbitre.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onStartEdit(arbitre)}
                  >
                    <td className="p-3 font-medium">{arbitre.nom}</td>
                    <td className="p-3">{arbitre.nom_en || '—'}</td>
                    <td className="p-3">{arbitre.nom_ar || '—'}</td>
                    <td className="p-3">
                      {arbitre.date_naissance
                        ? new Date(arbitre.date_naissance).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="p-3">
                      {arbitre.photo_url ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewPhoto(arbitre.photo_url || null)
                          }}
                          className="flex-shrink-0 group cursor-pointer"
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 group-hover:border-blue-500 transition-all shadow-md group-hover:shadow-lg group-hover:scale-105">
                            <img
                              src={arbitre.photo_url}
                              alt={arbitre.nom}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                                      <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                  `
                                }
                              }}
                            />
                          </div>
                        </button>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartEdit(arbitre)
                          }}
                          className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                            editingId === arbitre.id
                            ? 'btn btn-sm btn-primary'
                            : 'btn btn-sm btn-outline-primary'
                        }`}
                      >
                        {editingId === arbitre.id ? 'En cours...' : 'Modifier'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(arbitre.id)
                        }}
                        className="px-4 py-1.5 rounded text-xs font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
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
      )}
    </div>
  )
}
