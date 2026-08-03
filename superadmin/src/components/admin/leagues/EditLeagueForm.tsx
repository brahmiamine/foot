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
    <div className="col-12 col-lg-4">
      <div className="card border border-primary">
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0 text-primary">Modifier</h5>
          <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
        </div>
        <div className="card-body">
          <form onSubmit={onSubmit} className="row g-3">
            <div className="col-12">
              <label className="form-label">Fédération *</label>
              <select
                value={editForm.federation_id}
                onChange={(e) => setEditForm((prev) => ({ ...prev, federation_id: e.target.value }))}
                className="form-select"
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
            <div className="col-12">
              <label className="form-label">Nom (français) *</label>
              <input
                type="text"
                value={editForm.nom}
                onChange={(e) => setEditForm((prev) => ({ ...prev, nom: e.target.value }))}
                className="form-control"
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Nom (anglais)</label>
              <input
                type="text"
                value={editForm.nom_en}
                onChange={(e) => setEditForm((prev) => ({ ...prev, nom_en: e.target.value }))}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Nom (arabe)</label>
              <input
                type="text"
                value={editForm.nom_ar}
                onChange={(e) => setEditForm((prev) => ({ ...prev, nom_ar: e.target.value }))}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Logo</label>
              {editForm.logo_url ? (
                <div className="mb-2">
                  {imageErrors.has(editingId || '') ? (
                    <div className="avatar-md">
                      <span className="avatar-title rounded bg-light text-muted fs-6">
                        {editForm.nom.charAt(0).toUpperCase() || '—'}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onViewLogo(editForm.logo_url)}
                      className="avatar-md rounded border p-0 overflow-hidden"
                    >
                      <img
                        src={editForm.logo_url}
                        alt="Logo"
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
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
                className="form-control"
              />
              {uploadingEdit && <p className="text-muted small mt-1 mb-0">Envoi en cours...</p>}
            </div>
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-fill" disabled={uploadingEdit}>
                {uploadingEdit ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
              <button type="button" onClick={onClose} className="btn btn-light border">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
