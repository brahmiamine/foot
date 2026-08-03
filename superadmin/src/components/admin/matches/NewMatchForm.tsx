'use client'

import type { Arbitre, Journee, Team } from '@/types'
import type { Locale } from '@/lib/i18n'
import { formatJourneeLabel } from './utils'
import type { NewMatchForm as NewMatchFormState } from './types'

interface NewMatchFormProps {
  newForm: NewMatchFormState
  setNewForm: (form: NewMatchFormState) => void
  journeesOfSelectedSaison: Journee[]
  teams: Team[]
  arbitres: Arbitre[]
  creating: boolean
  locale: Locale
  onSubmit: () => void
}

export default function NewMatchForm({
  newForm,
  setNewForm,
  journeesOfSelectedSaison,
  teams,
  arbitres,
  creating,
  locale,
  onSubmit,
}: NewMatchFormProps) {
  return (
    <div className="card border border-success">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0 text-success">Nouveau match</h5>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Journée *</label>
            <select
              value={newForm.journee_id}
              onChange={(e) => setNewForm({ ...newForm, journee_id: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Sélectionner une journée</option>
              {journeesOfSelectedSaison.map((journee) => (
                <option key={journee.id} value={journee.id}>
                  {formatJourneeLabel(journee, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Équipe à domicile *</label>
            <select
              value={newForm.equipe_home}
              onChange={(e) => setNewForm({ ...newForm, equipe_home: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Sélectionner...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Équipe à l&apos;extérieur *</label>
            <select
              value={newForm.equipe_away}
              onChange={(e) => setNewForm({ ...newForm, equipe_away: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Sélectionner...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Date et heure</label>
            <input
              type="datetime-local"
              value={newForm.date}
              onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Score domicile</label>
            <input
              type="number"
              min="0"
              step="1"
              value={newForm.score_home}
              onChange={(e) => setNewForm({ ...newForm, score_home: e.target.value })}
              className="form-control"
              placeholder="0"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Score extérieur</label>
            <input
              type="number"
              min="0"
              step="1"
              value={newForm.score_away}
              onChange={(e) => setNewForm({ ...newForm, score_away: e.target.value })}
              className="form-control"
              placeholder="0"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Arbitre</label>
            <select
              value={newForm.arbitre_id}
              onChange={(e) => setNewForm({ ...newForm, arbitre_id: e.target.value })}
              className="form-select"
            >
              <option value="">Aucun arbitre</option>
              {arbitres.map((arbitre) => (
                <option key={arbitre.id} value={arbitre.id}>
                  {arbitre.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <button
              onClick={onSubmit}
              className="btn btn-success"
              disabled={creating || !newForm.journee_id || !newForm.equipe_home || !newForm.equipe_away}
            >
              {creating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Création...
                </>
              ) : (
                'Créer le match'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
