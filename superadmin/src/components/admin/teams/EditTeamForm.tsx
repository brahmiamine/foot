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
    <div className="col-span-12 lg:col-span-4 bg-white shadow-lg rounded-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-blue-700">Modifier l&apos;équipe</h3>
        <button
          onClick={onClose}
          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
        >
          ✕ Fermer
        </button>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <input
            type="text"
            value={editForm.nom}
            onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
            className="form-control"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (anglais)</label>
          <input
            type="text"
            value={editForm.nom_en}
            onChange={(e) => setEditForm({ ...editForm, nom_en: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nom (arabe)</label>
          <input
            type="text"
            value={editForm.nom_ar}
            onChange={(e) => setEditForm({ ...editForm, nom_ar: e.target.value })}
            className="form-control"
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Abréviation</label>
          <input
            type="text"
            value={editForm.abbr}
            onChange={(e) => setEditForm({ ...editForm, abbr: e.target.value.toUpperCase() })}
            className="form-control"
            maxLength={8}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select
              value={editForm.team_type}
              onChange={(e) => setEditForm({ ...editForm, team_type: e.target.value as TeamType })}
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
              value={editForm.country_code}
              onChange={(e) => setEditForm({ ...editForm, country_code: e.target.value })}
              className="form-control"
            >
              <option value="">Aucun</option>
              {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sport *</label>
            <select
              value={editForm.sport}
              onChange={(e) => setEditForm({ ...editForm, sport: e.target.value as Sport })}
              className="form-control"
              required
            >
              {Object.entries(SPORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie *</label>
            <select
              value={editForm.age_category}
              onChange={(e) => setEditForm({ ...editForm, age_category: e.target.value as AgeCategory })}
              className="form-control"
              required
            >
              {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ville</label>
          <input
            type="text"
            value={editForm.city}
            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Stade</label>
          <input
            type="text"
            value={editForm.stadium}
            onChange={(e) => setEditForm({ ...editForm, stadium: e.target.value })}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">URL du logo</label>
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
                className="w-16 h-16 object-contain border rounded"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={savingId === editingId}
        >
          {savingId === editingId ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
