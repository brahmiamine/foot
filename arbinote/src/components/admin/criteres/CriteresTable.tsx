'use client'

import type { CritereDefinition } from '@/types'
import { categorieLabels } from './constants'

interface CriteresTableProps {
  sortedCriteres: CritereDefinition[]
  loading: boolean
  editingId: string | null
  onRefresh: () => void
  onStartEdit: (critere: CritereDefinition) => void
}

export default function CriteresTable({
  sortedCriteres,
  loading,
  editingId,
  onRefresh,
  onStartEdit,
}: CriteresTableProps) {
  return (
    <div className={`${editingId ? 'col-span-12 md:col-span-8' : 'col-span-12'} bg-white shadow rounded-lg p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Critères ({sortedCriteres.length})</h3>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          disabled={loading}
        >
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500 uppercase text-xs tracking-wide">
                <th className="p-2">ID</th>
                <th className="p-2">Catégorie</th>
                <th className="p-2">Label FR</th>
                <th className="p-2">Label EN</th>
                <th className="p-2">Label AR</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {sortedCriteres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Aucun critère
                  </td>
                </tr>
              ) : (
                sortedCriteres.map((critere) => (
                  <tr
                    key={critere.id}
                    className={`border-b last:border-0 transition-colors cursor-pointer ${
                      editingId === critere.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onStartEdit(critere)}
                  >
                    <td className="p-3 font-mono text-xs">{critere.id}</td>
                    <td className="p-3">{categorieLabels[critere.categorie]}</td>
                    <td className="p-3 font-medium">{critere.label_fr}</td>
                    <td className="p-3">{critere.label_en || '—'}</td>
                    <td className="p-3">{critere.label_ar}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartEdit(critere)
                        }}
                        className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                          editingId === critere.id
                            ? 'bg-blue-700 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {editingId === critere.id ? 'En cours...' : 'Modifier'}
                      </button>
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
