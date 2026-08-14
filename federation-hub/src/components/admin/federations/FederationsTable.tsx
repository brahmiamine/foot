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
    <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
      <div className="card">
        <div className="card-body">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Logo</th>
                  <th>Code</th>
                  <th>Nom</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {federations.map((fed) => (
                  <tr key={fed.id}>
                    <td>
                      {fed.logo_url && !imageErrors.has(fed.id) ? (
                        <button
                          type="button"
                          onClick={() => onViewLogo(fed.logo_url || null)}
                          className="avatar-xs rounded overflow-hidden border p-0"
                        >
                          <img
                            src={fed.logo_url}
                            alt={fed.nom}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                            onError={() => {
                              setImageErrors((prev) => new Set(prev).add(fed.id))
                            }}
                          />
                        </button>
                      ) : (
                        <div className="avatar-xs">
                          <span className="avatar-title rounded bg-light text-muted fs-6">
                            {fed.code || '—'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="font-monospace small">{fed.code}</td>
                    <td>{fed.nom}</td>
                    <td>
                      <div className="form-check form-switch mb-0">
                        <input
                          type="checkbox"
                          role="switch"
                          className="form-check-input"
                          checked={fed.is_active ?? true}
                          onChange={(e) => {
                            const newStatus = e.target.checked
                            onToggleActive(fed, newStatus)
                          }}
                        />
                        <label className="form-check-label">
                          {fed.is_active ?? true ? 'Active' : 'Inactive'}
                        </label>
                      </div>
                    </td>
                    <td className="text-nowrap">
                      <div className="d-flex gap-2">
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
      </div>
    </div>
  )
}
