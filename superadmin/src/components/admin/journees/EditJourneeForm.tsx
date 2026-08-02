'use client'

import type { FormEvent } from 'react'
import type { Saison } from '@/types'
import { getSaisonDisplayName } from './constants'
import type { JourneeForm } from './types'

interface EditJourneeFormProps {
  editForm: JourneeForm
  setEditForm: (form: JourneeForm) => void
  savingId: string | null
  editingId: string
  saisons: Saison[]
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function EditJourneeForm({
  editForm,
  setEditForm,
  savingId,
  editingId,
  saisons,
  onSubmit,
  onClose,
}: EditJourneeFormProps) {
  return (
    <div className="col-12 col-lg-4">
      <div className="card border border-primary">
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0 text-primary">Modifier la journée</h5>
          <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={onSubmit}>
            <div className="col-12">
              <label className="form-label">Saison *</label>
              <select
                value={editForm.saison_id}
                onChange={(e) => setEditForm({ ...editForm, saison_id: e.target.value })}
                className="form-select"
                required
              >
                {saisons.map((saison) => (
                  <option key={saison.id} value={saison.id}>
                    {getSaisonDisplayName(saison)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Numéro</label>
              <input
                type="number"
                min="1"
                value={editForm.numero}
                onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })}
                className="form-control"
                placeholder="1, 2, 3..."
              />
            </div>
            <div className="col-6">
              <label className="form-label">Date</label>
              <input
                type="date"
                value={editForm.date_journee}
                onChange={(e) => setEditForm({ ...editForm, date_journee: e.target.value })}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Nom (français)</label>
              <input
                type="text"
                value={editForm.nom_fr}
                onChange={(e) => setEditForm({ ...editForm, nom_fr: e.target.value })}
                className="form-control"
                placeholder="Demi-finale, Finale..."
              />
            </div>
            <div className="col-12">
              <label className="form-label">Nom (anglais)</label>
              <input
                type="text"
                value={editForm.nom_en}
                onChange={(e) => setEditForm({ ...editForm, nom_en: e.target.value })}
                className="form-control"
                placeholder="Semi-final, Final..."
              />
            </div>
            <div className="col-12">
              <label className="form-label">Nom (arabe)</label>
              <input
                type="text"
                value={editForm.nom_ar}
                onChange={(e) => setEditForm({ ...editForm, nom_ar: e.target.value })}
                className="form-control"
                placeholder="نصف النهائي، النهائي..."
                dir="rtl"
              />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={savingId === editingId || !editForm.saison_id}>
                {savingId === editingId ? (
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
