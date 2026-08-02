'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { CritereDefinition } from '@/types'
import type { FormState } from './types'

interface EditCritereFormProps {
  editForm: FormState
  setEditForm: Dispatch<SetStateAction<FormState>>
  submitting: boolean
  editingId: string
  deletingId: string | null
  onSubmit: (event: FormEvent) => void
  onClose: () => void
  onDelete: (id: string) => void
}

export default function EditCritereForm({
  editForm,
  setEditForm,
  submitting,
  editingId,
  deletingId,
  onSubmit,
  onClose,
  onDelete,
}: EditCritereFormProps) {
  return (
    <div className="col-span-12 md:col-span-4 bg-white shadow-lg rounded-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-blue-700">Modifier le critère</h3>
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Identifiant</label>
          <input
            type="text"
            value={editForm.id}
            className="w-full border rounded px-3 py-2 bg-gray-100"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Catégorie</label>
          <select
            value={editForm.categorie}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, categorie: e.target.value as CritereDefinition['categorie'] }))
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="arbitre">Arbitre</option>
            <option value="assistant">Assistant</option>
            <option value="var">VAR</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label FR</label>
          <input
            type="text"
            value={editForm.label_fr}
            onChange={(e) => setEditForm((prev) => ({ ...prev, label_fr: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label EN</label>
          <input
            type="text"
            value={editForm.label_en}
            onChange={(e) => setEditForm((prev) => ({ ...prev, label_en: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label AR</label>
          <input
            type="text"
            value={editForm.label_ar}
            onChange={(e) => setEditForm((prev) => ({ ...prev, label_ar: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description FR</label>
          <textarea
            value={editForm.description_fr}
            onChange={(e) => setEditForm((prev) => ({ ...prev, description_fr: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description AR</label>
          <textarea
            value={editForm.description_ar}
            onChange={(e) => setEditForm((prev) => ({ ...prev, description_ar: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(editingId)}
            className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:opacity-60"
            disabled={deletingId === editingId}
          >
            {deletingId === editingId ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </form>
    </div>
  )
}
