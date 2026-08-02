'use client'

import type { FormEvent } from 'react'
import type { League } from '@/types'
import type { SaisonFormState } from './types'

interface CreateSaisonFormProps {
  createForm: SaisonFormState
  setCreateForm: (form: SaisonFormState) => void
  leagues: League[]
  creating: boolean
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function CreateSaisonForm({
  createForm,
  setCreateForm,
  leagues,
  creating,
  onSubmit,
  onClose,
}: CreateSaisonFormProps) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-green-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-green-700">Ajouter une saison</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="grid md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <input
            type="text"
            value={createForm.nom}
            onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
            className="form-control"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type de compétition *</label>
          <select
            value={createForm.type_competition}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
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
            value={createForm.league_id}
            onChange={(e) => setCreateForm({ ...createForm, league_id: e.target.value })}
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
            value={createForm.date_debut}
            onChange={(e) => setCreateForm({ ...createForm, date_debut: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date de fin</label>
          <input
            type="date"
            value={createForm.date_fin}
            onChange={(e) => setCreateForm({ ...createForm, date_fin: e.target.value })}
            className="form-control"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="btn btn-success w-100"
            disabled={creating}
          >
            {creating ? 'Ajout en cours...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  )
}
