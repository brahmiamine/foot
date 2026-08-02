'use client'

import type { FormEvent } from 'react'
import type { Saison } from '@/types'
import { getSaisonDisplayName } from './constants'
import type { JourneeForm } from './types'

interface CreateJourneeFormProps {
  createForm: JourneeForm
  setCreateForm: (form: JourneeForm) => void
  creating: boolean
  saisons: Saison[]
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function CreateJourneeForm({
  createForm,
  setCreateForm,
  creating,
  saisons,
  onSubmit,
  onClose,
}: CreateJourneeFormProps) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-green-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-green-700">Ajouter une journée</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="grid md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Saison *</label>
          <select
            value={createForm.saison_id}
            onChange={(e) => setCreateForm({ ...createForm, saison_id: e.target.value })}
            className="form-control"
            required
          >
            <option value="">Sélectionner une saison</option>
            {saisons.map((saison) => (
              <option key={saison.id} value={saison.id}>
                {getSaisonDisplayName(saison)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Numéro</label>
          <input
            type="number"
            min="1"
            value={createForm.numero}
            onChange={(e) => setCreateForm({ ...createForm, numero: e.target.value })}
            className="form-control"
            placeholder="1, 2, 3..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={createForm.date_journee}
            onChange={(e) => setCreateForm({ ...createForm, date_journee: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (français)</label>
          <input
            type="text"
            value={createForm.nom_fr}
            onChange={(e) => setCreateForm({ ...createForm, nom_fr: e.target.value })}
            className="form-control"
            placeholder="Demi-finale, Finale..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (anglais)</label>
          <input
            type="text"
            value={createForm.nom_en}
            onChange={(e) => setCreateForm({ ...createForm, nom_en: e.target.value })}
            className="form-control"
            placeholder="Semi-final, Final..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (arabe)</label>
          <input
            type="text"
            value={createForm.nom_ar}
            onChange={(e) => setCreateForm({ ...createForm, nom_ar: e.target.value })}
            className="form-control"
            placeholder="نصف النهائي، النهائي..."
            dir="rtl"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="btn btn-success w-100"
            disabled={creating || !createForm.saison_id}
          >
            {creating ? 'Ajout en cours...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  )
}
