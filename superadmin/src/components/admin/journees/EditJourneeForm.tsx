'use client'

import type { FormEvent } from 'react'
import type { Saison } from '@/types'
import { getSaisonDisplayName } from './constants'
import type { JourneeForm } from './types'

interface EditJourneeFormProps {
  editForm: JourneeForm
  setEditForm: (form: JourneeForm) => void
  savingId: string | null
  editingId: string
  saisons: Saison[]
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function EditJourneeForm({
  editForm,
  setEditForm,
  savingId,
  editingId,
  saisons,
  onSubmit,
  onClose,
}: EditJourneeFormProps) {
  return (
    <div className="col-span-12 md:col-span-4 bg-white shadow-lg rounded-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-blue-700">Modifier la journée</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Saison *</label>
          <select
            value={editForm.saison_id}
            onChange={(e) => setEditForm({ ...editForm, saison_id: e.target.value })}
            className="form-control"
            required
          >
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
            value={editForm.numero}
            onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })}
            className="form-control"
            placeholder="1, 2, 3..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={editForm.date_journee}
            onChange={(e) => setEditForm({ ...editForm, date_journee: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (français)</label>
          <input
            type="text"
            value={editForm.nom_fr}
            onChange={(e) => setEditForm({ ...editForm, nom_fr: e.target.value })}
            className="form-control"
            placeholder="Demi-finale, Finale..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (anglais)</label>
          <input
            type="text"
            value={editForm.nom_en}
            onChange={(e) => setEditForm({ ...editForm, nom_en: e.target.value })}
            className="form-control"
            placeholder="Semi-final, Final..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (arabe)</label>
          <input
            type="text"
            value={editForm.nom_ar}
            onChange={(e) => setEditForm({ ...editForm, nom_ar: e.target.value })}
            className="form-control"
            placeholder="نصف النهائي، النهائي..."
            dir="rtl"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={savingId === editingId || !editForm.saison_id}
        >
          {savingId === editingId ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
