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
    <section className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Nouveau match</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Journée *
          </label>
          <select
            value={newForm.journee_id}
            onChange={(e) => setNewForm({ ...newForm, journee_id: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Équipe à domicile *
          </label>
          <select
            value={newForm.equipe_home}
            onChange={(e) => setNewForm({ ...newForm, equipe_home: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Équipe à l&apos;extérieur *
          </label>
          <select
            value={newForm.equipe_away}
            onChange={(e) => setNewForm({ ...newForm, equipe_away: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date et heure
          </label>
          <input
            type="datetime-local"
            value={newForm.date}
            onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Score domicile
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={newForm.score_home}
            onChange={(e) => setNewForm({ ...newForm, score_home: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Score extérieur
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={newForm.score_away}
            onChange={(e) => setNewForm({ ...newForm, score_away: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arbitre
          </label>
          <select
            value={newForm.arbitre_id}
            onChange={(e) => setNewForm({ ...newForm, arbitre_id: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-full"
          >
            <option value="">Aucun arbitre</option>
            {arbitres.map((arbitre) => (
              <option key={arbitre.id} value={arbitre.id}>
                {arbitre.nom}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={onSubmit}
          className="btn btn-primary btn-sm"
          disabled={creating || !newForm.journee_id || !newForm.equipe_home || !newForm.equipe_away}
        >
          {creating ? 'Création...' : 'Créer le match'}
        </button>
      </div>
    </section>
  )
}
