'use client'

import type { FormEvent } from 'react'
import type { Saison } from '@/types'
import { getSaisonDisplayName } from './constants'
import type { JourneeForm } from './types'

interface CreateJourneeFormProps {
  createForm: JourneeForm
  setCreateForm: (form: JourneeForm) => void
  creating: boolean
  saisons: Saison[]
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function CreateJourneeForm({
  createForm,
  setCreateForm,
  creating,
  saisons,
  onSubmit,
  onClose,
}: CreateJourneeFormProps) {
  return (
    <div className="card border border-success">
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 text-success">Ajouter une journée</h5>
        <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
      </div>
      <div className="card-body">
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-12">
            <label className="form-label">Saison *</label>
            <select
              value={createForm.saison_id}
              onChange={(e) => setCreateForm({ ...createForm, saison_id: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Sélectionner une saison</option>
              {saisons.map((saison) => (
                <option key={saison.id} value={saison.id}>
                  {getSaisonDisplayName(saison)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Numéro</label>
            <input
              type="number"
              min="1"
              value={createForm.numero}
              onChange={(e) => setCreateForm({ ...createForm, numero: e.target.value })}
              className="form-control"
              placeholder="1, 2, 3..."
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Date</label>
            <input
              type="date"
              value={createForm.date_journee}
              onChange={(e) => setCreateForm({ ...createForm, date_journee: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Nom (français)</label>
            <input
              type="text"
              value={createForm.nom_fr}
              onChange={(e) => setCreateForm({ ...createForm, nom_fr: e.target.value })}
              className="form-control"
              placeholder="Demi-finale, Finale..."
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Nom (anglais)</label>
            <input
              type="text"
              value={createForm.nom_en}
              onChange={(e) => setCreateForm({ ...createForm, nom_en: e.target.value })}
              className="form-control"
              placeholder="Semi-final, Final..."
            />
          </div>
          <div className="col-12">
            <label className="form-label">Nom (arabe)</label>
            <input
              type="text"
              value={createForm.nom_ar}
              onChange={(e) => setCreateForm({ ...createForm, nom_ar: e.target.value })}
              className="form-control"
              placeholder="نصف النهائي، النهائي..."
              dir="rtl"
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-success" disabled={creating || !createForm.saison_id}>
              {creating ? (
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
