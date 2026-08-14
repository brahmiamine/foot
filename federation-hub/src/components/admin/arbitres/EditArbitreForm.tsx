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
    <div className="col-12 col-lg-4">
      <div className="card border border-primary">
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0 text-primary">Modifier l&apos;arbitre</h5>
          <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={onSubmit}>
            <div className="col-12">
              <label className="form-label">Nom (français)</label>
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
              <label className="form-label">Date de naissance</label>
              <input
                type="date"
                value={editForm.date_naissance}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, date_naissance: e.target.value }))
                }
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Fédération (ID)</label>
              <input className="form-control" value={editForm.federation_id} onChange={(e) => setEditForm((prev) => ({ ...prev, federation_id: e.target.value }))} />
            </div>
            <div className="col-12">
              <label className="form-label">Ligue (ID)</label>
              <input className="form-control" value={editForm.league_id} onChange={(e) => setEditForm((prev) => ({ ...prev, league_id: e.target.value }))} />
            </div>
            <div className="col-6">
              <label className="form-label">Catégorie</label>
              <input className="form-control" value={editForm.categorie} onChange={(e) => setEditForm((prev) => ({ ...prev, categorie: e.target.value }))} />
            </div>
            <div className="col-6">
              <label className="form-label">Grade</label>
              <input className="form-control" value={editForm.grade} onChange={(e) => setEditForm((prev) => ({ ...prev, grade: e.target.value }))} />
            </div>
            <div className="col-6">
              <label className="form-label">Début d&apos;activité</label>
              <input type="date" className="form-control" value={editForm.start_date} onChange={(e) => setEditForm((prev) => ({ ...prev, start_date: e.target.value }))} />
            </div>
            <div className="col-6">
              <label className="form-label">Statut</label>
              <select className="form-select" value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value, is_active: e.target.value === 'ACTIVE' }))}>
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="SUSPENDED">Suspendu</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Photo</label>
              {editForm.photo_url ? (
                <div className="d-flex align-items-start gap-3 mb-3 p-3 bg-light rounded border">
                  <img
                    src={editForm.photo_url}
                    alt="Photo actuelle"
                    className="avatar-md rounded-circle"
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="flex-grow-1">
                    <p className="text-muted small mb-2">Photo actuelle</p>
                    <button
                      type="button"
                      onClick={onDeletePhoto}
                      className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                    >
                      Supprimer la photo
                    </button>
                  </div>
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(setEditForm)(e.target.files)}
                className="form-control"
              />
              {uploadingEdit && (
                <div className="form-text d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Envoi en cours...
                </div>
              )}
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={uploadingEdit}>
                {uploadingEdit ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
