'use client'

import type { FormEvent } from 'react'
import type { TeamType, Sport, AgeCategory } from '@/types'
import { AGE_CATEGORY_LABELS, COUNTRY_LABELS, SPORT_LABELS } from './constants'
import type { TeamFormState } from './types'

interface EditTeamFormProps {
  editForm: TeamFormState
  setEditForm: (form: TeamFormState) => void
  savingId: string | null
  editingId: string
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function EditTeamForm({
  editForm,
  setEditForm,
  savingId,
  editingId,
  onSubmit,
  onClose,
}: EditTeamFormProps) {
  return (
    <div className="col-12 col-lg-4">
      <div className="card border border-primary">
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0 text-primary">Modifier l&apos;équipe</h5>
          <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={onSubmit}>
            <div className="col-12">
              <label className="form-label">Nom *</label>
              <input
                type="text"
                value={editForm.nom}
                onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                className="form-control"
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Nom (anglais)</label>
              <input
                type="text"
                value={editForm.nom_en}
                onChange={(e) => setEditForm({ ...editForm, nom_en: e.target.value })}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Nom (arabe)</label>
              <input
                type="text"
                value={editForm.nom_ar}
                onChange={(e) => setEditForm({ ...editForm, nom_ar: e.target.value })}
                className="form-control"
                dir="rtl"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Abréviation</label>
              <input
                type="text"
                value={editForm.abbr}
                onChange={(e) => setEditForm({ ...editForm, abbr: e.target.value.toUpperCase() })}
                className="form-control"
                maxLength={8}
              />
            </div>
            <div className="col-6">
              <label className="form-label">Type *</label>
              <select
                value={editForm.team_type}
                onChange={(e) => setEditForm({ ...editForm, team_type: e.target.value as TeamType })}
                className="form-select"
                required
              >
                <option value="club">Club</option>
                <option value="national">Sélection nationale</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Pays</label>
              <select
                value={editForm.country_code}
                onChange={(e) => setEditForm({ ...editForm, country_code: e.target.value })}
                className="form-select"
              >
                <option value="">Aucun</option>
                {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Sport *</label>
              <select
                value={editForm.sport}
                onChange={(e) => setEditForm({ ...editForm, sport: e.target.value as Sport })}
                className="form-select"
                required
              >
                {Object.entries(SPORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Catégorie *</label>
              <select
                value={editForm.age_category}
                onChange={(e) => setEditForm({ ...editForm, age_category: e.target.value as AgeCategory })}
                className="form-select"
                required
              >
                {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Ville</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Stade</label>
              <input
                type="text"
                value={editForm.stadium}
                onChange={(e) => setEditForm({ ...editForm, stadium: e.target.value })}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">URL du logo</label>
              <input
                type="url"
                value={editForm.logo_url}
                onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                className="form-control"
                placeholder="https://..."
              />
              {editForm.logo_url && (
                <div className="mt-2">
                  <img
                    src={editForm.logo_url}
                    alt="Aperçu"
                    className="avatar-md border rounded"
                    style={{ objectFit: 'contain' }}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={savingId === editingId}>
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
