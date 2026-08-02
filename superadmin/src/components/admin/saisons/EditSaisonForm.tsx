'use client'

import type { FormEvent } from 'react'
import type { League } from '@/types'
import type { SaisonFormState } from './types'

interface EditSaisonFormProps {
  editForm: SaisonFormState
  setEditForm: (form: SaisonFormState) => void
  leagues: League[]
  savingId: string | null
  editingId: string
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function EditSaisonForm({
  editForm,
  setEditForm,
  leagues,
  savingId,
  editingId,
  onSubmit,
  onClose,
}: EditSaisonFormProps) {
  return (
    <div className="col-span-12 md:col-span-4 bg-white shadow-lg rounded-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-blue-700">Modifier la saison</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <input
            type="text"
            value={editForm.nom}
            onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
            className="form-control"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type de compétition *</label>
          <select
            value={editForm.type_competition}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                type_competition: e.target.value as 'championnat' | 'coupe' | 'tournois',
              })
            }
            className="form-control"
            required
          >
            <option value="championnat">Championnat</option>
            <option value="coupe">Coupe</option>
            <option value="tournois">Tournois</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ligue</label>
          <select
            value={editForm.league_id}
            onChange={(e) => setEditForm({ ...editForm, league_id: e.target.value })}
            className="form-control"
          >
            <option value="">Aucune ligue</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date de début</label>
          <input
            type="date"
            value={editForm.date_debut}
            onChange={(e) => setEditForm({ ...editForm, date_debut: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date de fin</label>
          <input
            type="date"
            value={editForm.date_fin}
            onChange={(e) => setEditForm({ ...editForm, date_fin: e.target.value })}
            className="form-control"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={savingId === editingId}
        >
          {savingId === editingId ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
