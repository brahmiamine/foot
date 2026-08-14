'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { CritereDefinition } from '@/types'
import type { FormState } from './types'

interface CreateCritereFormProps {
  createForm: FormState
  setCreateForm: Dispatch<SetStateAction<FormState>>
  submitting: boolean
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

export default function CreateCritereForm({
  createForm,
  setCreateForm,
  submitting,
  onSubmit,
  onClose,
}: CreateCritereFormProps) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-green-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-green-700">Ajouter un critère</h3>
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="grid md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Identifiant</label>
          <input
            type="text"
            value={createForm.id}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, id: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="ex: sifflet"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Catégorie</label>
          <select
            value={createForm.categorie}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, categorie: e.target.value as CritereDefinition['categorie'] }))
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
            value={createForm.label_fr}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, label_fr: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label EN</label>
          <input
            type="text"
            value={createForm.label_en}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, label_en: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label AR</label>
          <input
            type="text"
            value={createForm.label_ar}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, label_ar: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Description FR</label>
          <textarea
            value={createForm.description_fr}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, description_fr: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Description AR</label>
          <textarea
            value={createForm.description_ar}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, description_ar: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Création en cours...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  )
}
