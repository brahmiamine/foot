'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Federation, LeagueFormState } from './types'

interface CreateLeagueFormProps {
  federations: Federation[]
  createForm: LeagueFormState
  setCreateForm: Dispatch<SetStateAction<LeagueFormState>>
  uploadingCreate: boolean
  onSubmit: (e: FormEvent) => void
  onFileChange: (fileList: FileList | null) => void
  onClose: () => void
}

export default function CreateLeagueForm({
  federations,
  createForm,
  setCreateForm,
  uploadingCreate,
  onSubmit,
  onFileChange,
  onClose,
}: CreateLeagueFormProps) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-green-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-green-700">Ajouter une ligue</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="grid md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Fédération *</label>
          <select
            value={createForm.federation_id}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, federation_id: e.target.value }))}
            className="form-control"
            required
          >
            <option value="">Sélectionner une fédération</option>
            {federations.map((fed) => (
              <option key={fed.id} value={fed.id}>
                {fed.code} - {fed.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (français) *</label>
          <input
            type="text"
            value={createForm.nom}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, nom: e.target.value }))}
            className="form-control"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (anglais)</label>
          <input
            type="text"
            value={createForm.nom_en}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_en: e.target.value }))}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (arabe)</label>
          <input
            type="text"
            value={createForm.nom_ar}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_ar: e.target.value }))}
            className="form-control"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files)}
            className="w-full"
          />
          {uploadingCreate && <p className="text-xs text-gray-500 mt-1">Envoi en cours...</p>}
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="btn btn-success w-100"
            disabled={uploadingCreate}
          >
            {uploadingCreate ? 'Ajout en cours...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  )
}
