'use client'

import { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ArbitreFormState } from './types'

interface EditArbitreFormProps {
  editForm: ArbitreFormState
  setEditForm: Dispatch<SetStateAction<ArbitreFormState>>
  uploadingEdit: boolean
  handleFileChange: (
    formSetter: Dispatch<SetStateAction<ArbitreFormState>>
  ) => (fileList: FileList | null) => void
  onDeletePhoto: () => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

export default function EditArbitreForm({
  editForm,
  setEditForm,
  uploadingEdit,
  handleFileChange,
  onDeletePhoto,
  onSubmit,
  onClose,
}: EditArbitreFormProps) {
  return (
    <div className="col-span-12 md:col-span-4 bg-white shadow-lg rounded-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-blue-700">Modifier l&apos;arbitre</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (français)</label>
          <input
            type="text"
            value={editForm.nom}
            onChange={(e) => setEditForm((prev) => ({ ...prev, nom: e.target.value }))}
            className="form-control"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (anglais)</label>
          <input
            type="text"
            value={editForm.nom_en}
            onChange={(e) => setEditForm((prev) => ({ ...prev, nom_en: e.target.value }))}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (arabe)</label>
          <input
            type="text"
            value={editForm.nom_ar}
            onChange={(e) => setEditForm((prev) => ({ ...prev, nom_ar: e.target.value }))}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date de naissance</label>
          <input
            type="date"
            value={editForm.date_naissance}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, date_naissance: e.target.value }))
            }
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Photo</label>
          {editForm.photo_url ? (
            <div className="mb-3 p-3 bg-gray-50 rounded border">
              <div className="flex items-start gap-4 mb-3">
                <img
                  src={editForm.photo_url}
                  alt="Photo actuelle"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">Photo actuelle</p>
                  <button
                    type="button"
                    onClick={onDeletePhoto}
                    className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                  >
                    Supprimer la photo
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(setEditForm)(e.target.files)}
            className="w-full"
          />
          {uploadingEdit && <p className="text-xs text-gray-500 mt-1">Envoi en cours...</p>}
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={uploadingEdit}
        >
          {uploadingEdit ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
