'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Federation, LeagueFormState } from './types'

interface EditLeagueFormProps {
  federations: Federation[]
  editForm: LeagueFormState
  setEditForm: Dispatch<SetStateAction<LeagueFormState>>
  editingId: string | null
  uploadingEdit: boolean
  imageErrors: Set<string>
  onSubmit: (e: FormEvent) => void
  onFileChange: (fileList: FileList | null) => void
  onViewLogo: (url: string) => void
  onImageError: (id: string) => void
  onClose: () => void
}

export default function EditLeagueForm({
  federations,
  editForm,
  setEditForm,
  editingId,
  uploadingEdit,
  imageErrors,
  onSubmit,
  onFileChange,
  onViewLogo,
  onImageError,
  onClose,
}: EditLeagueFormProps) {
  return (
    <div className="col-span-12 md:col-span-4 bg-white shadow rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Modifier</h3>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fédération *</label>
          <select
            value={editForm.federation_id}
            onChange={(e) => setEditForm((prev) => ({ ...prev, federation_id: e.target.value }))}
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
          <label className="block text-sm font-medium mb-1">Logo</label>
          {editForm.logo_url ? (
            <div className="mb-2">
              {imageErrors.has(editingId || '') ? (
                <div className="w-20 h-20 rounded overflow-hidden border bg-gray-200 flex items-center justify-center text-sm text-gray-400 font-semibold">
                  {editForm.nom.charAt(0).toUpperCase() || '—'}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onViewLogo(editForm.logo_url)}
                  className="relative w-20 h-20 rounded overflow-hidden border bg-gray-100"
                >
                  <img
                    src={editForm.logo_url}
                    alt="Logo"
                    className="w-full h-full object-cover"
                    onError={() => {
                      if (editingId) {
                        onImageError(editingId)
                      }
                    }}
                  />
                </button>
              )}
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files)}
            className="w-full"
          />
          {uploadingEdit && <p className="text-xs text-gray-500 mt-1">Envoi en cours...</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="btn btn-primary flex-fill"
            disabled={uploadingEdit}
          >
            {uploadingEdit ? 'Enregistrement...' : 'Enregistrer'}
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
    </div>
  )
}
