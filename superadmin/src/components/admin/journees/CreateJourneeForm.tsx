'use client'

import type { FormEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
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
  const { t } = useTranslations()
  return (
    <div className="card border border-success">
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 text-success">{t('admin.journees.createTitle')}</h5>
        <button type="button" onClick={onClose} className="btn-close" aria-label={t('admin.common.close')} />
      </div>
      <div className="card-body">
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-12">
            <label className="form-label">{t('admin.journees.seasonRequired')}</label>
            <select
              value={createForm.saison_id}
              onChange={(e) => setCreateForm({ ...createForm, saison_id: e.target.value })}
              className="form-select"
              required
            >
              <option value="">{t('admin.journees.selectSeason')}</option>
              {saisons.map((saison) => (
                <option key={saison.id} value={saison.id}>
                  {getSaisonDisplayName(saison)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">{t('admin.journees.number')}</label>
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
            <label className="form-label">{t('admin.journees.date')}</label>
            <input
              type="date"
              value={createForm.date_journee}
              onChange={(e) => setCreateForm({ ...createForm, date_journee: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">{t('admin.journees.nameFrench')}</label>
            <input
              type="text"
              value={createForm.nom_fr}
              onChange={(e) => setCreateForm({ ...createForm, nom_fr: e.target.value })}
              className="form-control"
              placeholder={t('admin.journees.nameFrPlaceholder')}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">{t('admin.journees.nameEnglish')}</label>
            <input
              type="text"
              value={createForm.nom_en}
              onChange={(e) => setCreateForm({ ...createForm, nom_en: e.target.value })}
              className="form-control"
              placeholder={t('admin.journees.nameEnPlaceholder')}
            />
          </div>
          <div className="col-12">
            <label className="form-label">{t('admin.journees.nameArabic')}</label>
            <input
              type="text"
              value={createForm.nom_ar}
              onChange={(e) => setCreateForm({ ...createForm, nom_ar: e.target.value })}
              className="form-control"
              placeholder={t('admin.journees.nameArPlaceholder')}
              dir="rtl"
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-success" disabled={creating || !createForm.saison_id}>
              {creating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  {t('admin.journees.creating')}
                </>
              ) : (
                t('admin.common.add')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
