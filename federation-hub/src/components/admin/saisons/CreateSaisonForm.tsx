'use client'

import type { FormEvent } from 'react'
import type { League } from '@/types'
import type { SaisonFormState } from './types'

interface CreateSaisonFormProps {
  createForm: SaisonFormState
  setCreateForm: (form: SaisonFormState) => void
  leagues: League[]
  creating: boolean
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function CreateSaisonForm({
  createForm,
  setCreateForm,
  leagues,
  creating,
  onSubmit,
  onClose,
}: CreateSaisonFormProps) {
  return (
    <div className="card border border-success">
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 text-success">Ajouter une saison</h5>
        <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
      </div>
      <div className="card-body">
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-md-6">
            <label className="form-label">Nom *</label>
            <input
              type="text"
              value={createForm.nom}
              onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Type de compétition *</label>
            <select
              value={createForm.type_competition}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  type_competition: e.target.value as 'championnat' | 'coupe' | 'tournois',
                })
              }
              className="form-select"
              required
            >
              <option value="championnat">Championnat</option>
              <option value="coupe">Coupe</option>
              <option value="tournois">Tournois</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Ligue</label>
            <select
              value={createForm.league_id}
              onChange={(e) => setCreateForm({ ...createForm, league_id: e.target.value })}
              className="form-select"
            >
              <option value="">Aucune ligue</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Date de début</label>
            <input
              type="date"
              value={createForm.date_debut}
              onChange={(e) => setCreateForm({ ...createForm, date_debut: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Date de fin</label>
            <input
              type="date"
              value={createForm.date_fin}
              onChange={(e) => setCreateForm({ ...createForm, date_fin: e.target.value })}
              className="form-control"
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
