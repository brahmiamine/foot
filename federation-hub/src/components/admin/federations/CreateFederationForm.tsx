'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { FederationFormState } from './types'

interface CreateFederationFormProps {
  createForm: FederationFormState
  setCreateForm: Dispatch<SetStateAction<FederationFormState>>
  uploadingCreate: boolean
  onSubmit: (e: FormEvent) => void
  onClose: () => void
  onFileChange: (fileList: FileList | null) => void
}

export default function CreateFederationForm({
  createForm,
  setCreateForm,
  uploadingCreate,
  onSubmit,
  onClose,
  onFileChange,
}: CreateFederationFormProps) {
  return (
    <div className="card border border-success">
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 text-success">Ajouter une fédération</h5>
        <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
      </div>
      <div className="card-body">
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-md-6">
            <label className="form-label">Code *</label>
            <input
              type="text"
              value={createForm.code}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              className="form-control"
              required
              maxLength={8}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Nom (français) *</label>
            <input
              type="text"
              value={createForm.nom}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nom: e.target.value }))}
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Nom (anglais)</label>
            <input
              type="text"
              value={createForm.nom_en}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_en: e.target.value }))}
              className="form-control"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Nom (arabe)</label>
            <input
              type="text"
              value={createForm.nom_ar}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_ar: e.target.value }))}
              className="form-control"
              dir="rtl"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files)}
              className="form-control"
            />
            {uploadingCreate && (
              <div className="form-text d-flex align-items-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Envoi en cours...
              </div>
            )}
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-success" disabled={uploadingCreate}>
              {uploadingCreate ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Ajout en cours...
                </>
              ) : (
                'Ajouter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
