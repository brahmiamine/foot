'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { FederationFormState } from './types'

interface EditFederationFormProps {
  editForm: FederationFormState
  setEditForm: Dispatch<SetStateAction<FederationFormState>>
  uploadingEdit: boolean
  editingId: string | null
  imageErrors: Set<string>
  setImageErrors: Dispatch<SetStateAction<Set<string>>>
  onViewLogo: (logoUrl: string | null) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
  onFileChange: (fileList: FileList | null) => void
}

export default function EditFederationForm({
  editForm,
  setEditForm,
  uploadingEdit,
  editingId,
  imageErrors,
  setImageErrors,
  onViewLogo,
  onSubmit,
  onClose,
  onFileChange,
}: EditFederationFormProps) {
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
              <label className="form-label">Code *</label>
              <input
                type="text"
                value={editForm.code}
                onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="form-control"
                required
                maxLength={8}
              />
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
                dir="rtl"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Logo</label>
              {editForm.logo_url ? (
                <div className="mb-2">
                  {imageErrors.has(editingId || '') ? (
                    <div className="avatar-md">
                      <span className="avatar-title rounded bg-light text-muted fs-6">
                        {editForm.code || '—'}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onViewLogo(editForm.logo_url)}
                      className="avatar-md rounded overflow-hidden border p-0"
                    >
                      <img
                        src={editForm.logo_url}
                        alt="Logo"
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                        onError={() => {
                          if (editingId) {
                            setImageErrors((prev) => new Set(prev).add(editingId))
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
              {uploadingEdit && (
                <div className="form-text d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Envoi en cours...
                </div>
              )}
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
