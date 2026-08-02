'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Federation } from './types'

interface FederationsTableProps {
  federations: Federation[]
  editingId: string | null
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  imageErrors: Set<string>
  setImageErrors: Dispatch<SetStateAction<Set<string>>>
  onViewLogo: (logoUrl: string | null) => void
  onStartEdit: (federation: Federation) => void
  onDelete: (id: string) => void
  onToggleActive: (fed: Federation, newStatus: boolean) => void
}

export default function FederationsTable({
  federations,
  editingId,
  searchQuery,
  setSearchQuery,
  imageErrors,
  setImageErrors,
  onViewLogo,
  onStartEdit,
  onDelete,
  onToggleActive,
}: FederationsTableProps) {
  return (
    <div className={`${editingId ? 'col-span-12 md:col-span-8' : 'col-span-12'} bg-white shadow rounded-lg p-5`}>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-control"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="table table-nowrap align-middle mb-0">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Logo</th>
              <th className="text-left py-2 px-2">Code</th>
              <th className="text-left py-2 px-2">Nom</th>
              <th className="text-left py-2 px-2">Statut</th>
              <th className="text-left py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {federations.map((fed) => (
              <tr key={fed.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2">
                  {fed.logo_url && !imageErrors.has(fed.id) ? (
                    <button
                      onClick={() => onViewLogo(fed.logo_url || null)}
                      className="relative w-10 h-10 rounded overflow-hidden border bg-gray-100"
                    >
                      <img
                        src={fed.logo_url}
                        alt={fed.nom}
                        className="w-full h-full object-cover"
                        onError={() => {
                          setImageErrors((prev) => new Set(prev).add(fed.id))
                        }}
                      />
                    </button>
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-semibold">
                      {fed.code || '—'}
                    </div>
                  )}
                </td>
                <td className="py-2 px-2 font-mono text-xs">{fed.code}</td>
                <td className="py-2 px-2">{fed.nom}</td>
                <td className="py-2 px-2">
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={fed.is_active ?? true}
                      onChange={(e) => {
                        const newStatus = e.target.checked
                        onToggleActive(fed, newStatus)
                      }}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {fed.is_active ?? true ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </td>
                <td className="py-2 px-2 text-nowrap">
                  <div className="d-inline-flex gap-2">
                    <button
                      onClick={() => onStartEdit(fed)}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => onDelete(fed.id)}
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
