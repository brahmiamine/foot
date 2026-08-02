'use client'

import { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ArbitreFormState } from './types'

interface CreateArbitreFormProps {
  createForm: ArbitreFormState
  setCreateForm: Dispatch<SetStateAction<ArbitreFormState>>
  uploadingCreate: boolean
  handleFileChange: (
    formSetter: Dispatch<SetStateAction<ArbitreFormState>>
  ) => (fileList: FileList | null) => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

export default function CreateArbitreForm({
  createForm,
  setCreateForm,
  uploadingCreate,
  handleFileChange,
  onSubmit,
  onClose,
}: CreateArbitreFormProps) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-green-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-green-700">Ajouter un arbitre</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="grid md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (français)</label>
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
        <div>
          <label className="block text-sm font-medium mb-1">Date de naissance</label>
          <input
            type="date"
            value={createForm.date_naissance}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, date_naissance: e.target.value }))
            }
            className="form-control"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(setCreateForm)(e.target.files)}
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
