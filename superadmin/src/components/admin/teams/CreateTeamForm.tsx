'use client'

import type { FormEvent } from 'react'
import type { TeamType, Sport, AgeCategory } from '@/types'
import { AGE_CATEGORY_LABELS, COUNTRY_LABELS, SPORT_LABELS } from './constants'
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
    <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-green-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-green-700">Ajouter une équipe</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="grid md:grid-cols-3 gap-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <input
            type="text"
            value={createForm.nom}
            onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
            className="form-control"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (anglais)</label>
          <input
            type="text"
            value={createForm.nom_en}
            onChange={(e) => setCreateForm({ ...createForm, nom_en: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (arabe)</label>
          <input
            type="text"
            value={createForm.nom_ar}
            onChange={(e) => setCreateForm({ ...createForm, nom_ar: e.target.value })}
            className="form-control"
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Abréviation</label>
          <input
            type="text"
            value={createForm.abbr}
            onChange={(e) => setCreateForm({ ...createForm, abbr: e.target.value.toUpperCase() })}
            className="form-control"
            maxLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select
            value={createForm.team_type}
            onChange={(e) => setCreateForm({ ...createForm, team_type: e.target.value as TeamType })}
            className="form-control"
            required
          >
            <option value="club">Club</option>
            <option value="national">Sélection nationale</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pays</label>
          <select
            value={createForm.country_code}
            onChange={(e) => setCreateForm({ ...createForm, country_code: e.target.value })}
            className="form-control"
          >
            <option value="">Sélectionner un pays</option>
            {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sport *</label>
          <select
            value={createForm.sport}
            onChange={(e) => setCreateForm({ ...createForm, sport: e.target.value as Sport })}
            className="form-control"
            required
          >
            {Object.entries(SPORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Catégorie d&apos;âge *</label>
          <select
            value={createForm.age_category}
            onChange={(e) => setCreateForm({ ...createForm, age_category: e.target.value as AgeCategory })}
            className="form-control"
            required
          >
            {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ville</label>
          <input
            type="text"
            value={createForm.city}
            onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Stade</label>
          <input
            type="text"
            value={createForm.stadium}
            onChange={(e) => setCreateForm({ ...createForm, stadium: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">URL du logo</label>
          <input
            type="url"
            value={createForm.logo_url}
            onChange={(e) => setCreateForm({ ...createForm, logo_url: e.target.value })}
            className="form-control"
            placeholder="https://..."
          />
        </div>
        <div className="md:col-span-3">
          <button
            type="submit"
            className="btn btn-success w-100"
            disabled={creating}
          >
            {creating ? 'Ajout en cours...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  )
}
