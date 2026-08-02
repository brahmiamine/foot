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
    <div className="card border border-success">
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 text-success">Ajouter une ligue</h5>
        <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
      </div>
      <div className="card-body">
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-md-6">
            <label className="form-label">Fédération *</label>
            <select
              value={createForm.federation_id}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, federation_id: e.target.value }))}
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
            {uploadingCreate && <p className="text-muted small mt-1 mb-0">Envoi en cours...</p>}
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-success w-100" disabled={uploadingCreate}>
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
