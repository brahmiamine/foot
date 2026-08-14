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
    <div className="card border border-success">
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 text-success">Ajouter un arbitre</h5>
        <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
      </div>
      <div className="card-body">
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-md-4">
            <label className="form-label">Nom (français)</label>
            <input
              type="text"
              value={createForm.nom}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nom: e.target.value }))}
              className="form-control"
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Nom (anglais)</label>
            <input
              type="text"
              value={createForm.nom_en}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_en: e.target.value }))}
              className="form-control"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Nom (arabe)</label>
            <input
              type="text"
              value={createForm.nom_ar}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nom_ar: e.target.value }))}
              className="form-control"
              dir="rtl"
            />
          </div>
          <div className="col-md-4">
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
          <div className="col-md-4">
            <label className="form-label">Fédération (ID)</label>
            <input className="form-control" value={createForm.federation_id} onChange={(e) => setCreateForm((prev) => ({ ...prev, federation_id: e.target.value }))} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Ligue (ID)</label>
            <input className="form-control" value={createForm.league_id} onChange={(e) => setCreateForm((prev) => ({ ...prev, league_id: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Catégorie</label>
            <input className="form-control" value={createForm.categorie} onChange={(e) => setCreateForm((prev) => ({ ...prev, categorie: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Grade</label>
            <input className="form-control" value={createForm.grade} onChange={(e) => setCreateForm((prev) => ({ ...prev, grade: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Début d&apos;activité</label>
            <input type="date" className="form-control" value={createForm.start_date} onChange={(e) => setCreateForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Statut</label>
            <select className="form-select" value={createForm.status} onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value, is_active: e.target.value === 'ACTIVE' }))}>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(setCreateForm)(e.target.files)}
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
