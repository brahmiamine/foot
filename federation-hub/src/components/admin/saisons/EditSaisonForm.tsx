'use client'

import type { FormEvent } from 'react'
import type { League } from '@/types'
import type { SaisonFormState } from './types'

interface EditSaisonFormProps {
  editForm: SaisonFormState
  setEditForm: (form: SaisonFormState) => void
  leagues: League[]
  savingId: string | null
  editingId: string
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export default function EditSaisonForm({
  editForm,
  setEditForm,
  leagues,
  savingId,
  editingId,
  onSubmit,
  onClose,
}: EditSaisonFormProps) {
  return (
    <div className="col-12 col-lg-4">
      <div className="card border border-primary">
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0 text-primary">Modifier la saison</h5>
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
              <label className="form-label">Type de compétition *</label>
              <select
                value={editForm.type_competition}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
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
            <div className="col-12">
              <label className="form-label">Ligue</label>
              <select
                value={editForm.league_id}
                onChange={(e) => setEditForm({ ...editForm, league_id: e.target.value })}
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
            <div className="col-12">
              <label className="form-label">Date de début</label>
              <input
                type="date"
                value={editForm.date_debut}
                onChange={(e) => setEditForm({ ...editForm, date_debut: e.target.value })}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Date de fin</label>
              <input
                type="date"
                value={editForm.date_fin}
                onChange={(e) => setEditForm({ ...editForm, date_fin: e.target.value })}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input id="edit-requires-player-contract" className="form-check-input" type="checkbox" checked={editForm.requiresPlayerContract} onChange={(e) => setEditForm({ ...editForm, requiresPlayerContract: e.target.checked })} />
                <label className="form-check-label" htmlFor="edit-requires-player-contract">Contrat joueur homologué obligatoire</label>
              </div>
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
