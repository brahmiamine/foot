'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ArbitreFormState } from './types'

interface CreateArbitreFormProps {
  createForm: ArbitreFormState
  setCreateForm: Dispatch<SetStateAction<ArbitreFormState>>
  uploadingCreate: boolean
  onSubmit: (event: FormEvent) => void
  onFileChange: (fileList: FileList | null) => void
}

export default function CreateArbitreForm({
  createForm,
  setCreateForm,
  uploadingCreate,
  onSubmit,
  onFileChange,
}: CreateArbitreFormProps) {
  return (
    <div className="bg-white shadow rounded-lg p-5">
      <h3 className="text-xl font-semibold mb-4">Ajouter un arbitre</h3>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="form-label">Nom (français)</label>
          <input
            type="text"
            value={createForm.nom}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, nom: e.target.value }))}
            className="form-control"
            required
          />
        </div>
        <div>
          <label className="form-label">Nom (anglais)</label>
          <input
            type="text"
            value={createForm.nom_en}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_en: e.target.value }))}
            className="form-control"
          />
        </div>
        <div>
          <label className="form-label">Nom (arabe)</label>
          <input
            type="text"
            value={createForm.nom_ar}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_ar: e.target.value }))}
            className="form-control"
          />
        </div>
        <div>
          <label className="form-label">Date de naissance</label>
          <input
            type="date"
            value={createForm.date_naissance}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, date_naissance: e.target.value }))
            }
            className="form-control"
          />
        </div>
        <div>
          <label className="form-label">Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files)}
            className="form-control"
          />
          {uploadingCreate && <p className="text-xs text-gray-500 mt-1">Envoi en cours...</p>}
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={uploadingCreate}
        >
          Ajouter
        </button>
      </form>
    </div>
  )
}
