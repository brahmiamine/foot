'use client'

import type { FormEvent } from 'react'
import type { TeamType, Sport, AgeCategory, Gender } from '@/types'
import { AGE_CATEGORY_LABELS, COUNTRY_LABELS, GENDER_LABELS, SPORT_LABELS } from './constants'
import type { TeamFormState } from './types'

interface CreateTeamFormProps {
  createForm: TeamFormState
  setCreateForm: (form: TeamFormState) => void
  creating: boolean
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function CreateTeamForm({
  createForm,
  setCreateForm,
  creating,
  onSubmit,
  onClose,
}: CreateTeamFormProps) {
  return (
    <div className="card border border-success">
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 text-success">Ajouter une équipe</h5>
        <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
      </div>
      <div className="card-body">
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-md-4">
            <label className="form-label">Nom *</label>
            <input
              type="text"
              value={createForm.nom}
              onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
              className="form-control"
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Nom (anglais)</label>
            <input
              type="text"
              value={createForm.nom_en}
              onChange={(e) => setCreateForm({ ...createForm, nom_en: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Nom (arabe)</label>
            <input
              type="text"
              value={createForm.nom_ar}
              onChange={(e) => setCreateForm({ ...createForm, nom_ar: e.target.value })}
              className="form-control"
              dir="rtl"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Abréviation</label>
            <input
              type="text"
              value={createForm.abbr}
              onChange={(e) => setCreateForm({ ...createForm, abbr: e.target.value.toUpperCase() })}
              className="form-control"
              maxLength={8}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Type *</label>
            <select
              value={createForm.team_type}
              onChange={(e) => setCreateForm({ ...createForm, team_type: e.target.value as TeamType })}
              className="form-select"
              required
            >
              <option value="club">Club</option>
              <option value="national">Sélection nationale</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Pays</label>
            <select
              value={createForm.country_code}
              onChange={(e) => setCreateForm({ ...createForm, country_code: e.target.value })}
              className="form-select"
            >
              <option value="">Sélectionner un pays</option>
              {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Sport *</label>
            <select
              value={createForm.sport}
              onChange={(e) => setCreateForm({ ...createForm, sport: e.target.value as Sport })}
              className="form-select"
              required
            >
              {Object.entries(SPORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Catégorie d&apos;âge *</label>
            <select
              value={createForm.age_category}
              onChange={(e) => setCreateForm({ ...createForm, age_category: e.target.value as AgeCategory })}
              className="form-select"
              required
            >
              {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Genre *</label>
            <select
              value={createForm.gender}
              onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value as Gender })}
              className="form-select"
              required
            >
              {Object.entries(GENDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Ville</label>
            <input
              type="text"
              value={createForm.city}
              onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Stade</label>
            <input
              type="text"
              value={createForm.stadium}
              onChange={(e) => setCreateForm({ ...createForm, stadium: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">URL du logo</label>
            <input
              type="url"
              value={createForm.logo_url}
              onChange={(e) => setCreateForm({ ...createForm, logo_url: e.target.value })}
              className="form-control"
              placeholder="https://..."
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-success" disabled={creating}>
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
