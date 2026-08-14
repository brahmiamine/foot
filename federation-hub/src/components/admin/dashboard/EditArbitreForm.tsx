'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ArbitreFormState } from './types'

interface EditArbitreFormProps {
  editForm: ArbitreFormState
  setEditForm: Dispatch<SetStateAction<ArbitreFormState>>
  uploadingEdit: boolean
  onSubmit: (event: FormEvent) => void
  onFileChange: (fileList: FileList | null) => void
  onClose: () => void
}

export default function EditArbitreForm({
  editForm,
  setEditForm,
  uploadingEdit,
  onSubmit,
  onFileChange,
  onClose,
}: EditArbitreFormProps) {
  return (
    <section className="bg-white shadow-lg rounded-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-blue-700">Modifier l&apos;arbitre</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="grid md:grid-cols-2 gap-6" onSubmit={onSubmit}>
        <div className="space-y-4">
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
        </div>
        <div className="space-y-4">
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
                    className="w-24 h-24 object-cover rounded border-2 border-gray-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-2">Photo actuelle</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm((prev) => ({ ...prev, photo_url: '', photoFile: null }))
                      }}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium transition-colors"
                    >
                      ✕ Supprimer la photo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 p-3 bg-gray-50 rounded border border-dashed">
                <p className="text-sm text-gray-500">Aucune photo</p>
              </div>
            )}
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFileChange(e.target.files)}
                className="w-full text-sm"
              />
              {uploadingEdit && (
                <p className="text-xs text-blue-600 mt-1">⏳ Envoi en cours...</p>
              )}
              {editForm.photoFile && (
                <div className="p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-700 font-medium">
                    ✓ Nouvelle photo sélectionnée: {editForm.photoFile.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploadingEdit}
          >
            Sauvegarder
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-light border"
          >
            Annuler
          </button>
        </div>
      </form>
    </section>
  )
}
