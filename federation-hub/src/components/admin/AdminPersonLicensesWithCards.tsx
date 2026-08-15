'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminPersonLicensesManager from './AdminPersonLicensesManager'
import { FederationLicenseCard } from './FederationLicenseCard'
import { useTranslations } from '@/lib/i18n'
import type { PersonLicenseCardRecord } from '../../../../packages/regulatory-shared/src/licenseCard'

type LicenseWithName = PersonLicenseCardRecord & { personName: string }

export default function AdminPersonLicensesWithCards() {
  const { locale } = useTranslations()
  const [licenses, setLicenses] = useState<LicenseWithName[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/licenses', { cache: 'no-store' })
      const data = await response.json() as LicenseWithName[] | { error?: string }
      if (!response.ok) throw new Error(!Array.isArray(data) ? data.error ?? 'Erreur' : 'Erreur')
      setLicenses(Array.isArray(data) ? data : [])
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur') }
  }, [])
  useEffect(() => { void load() }, [load])
  const issued = licenses.filter((license) => Boolean(license.licenseNumber))
  const cardLocale = locale === 'ar' ? 'ar' : 'fr'

  return <div className="d-flex flex-column gap-4">
    <AdminPersonLicensesManager />
    <section className="card border-0 shadow-sm"><div className="card-body d-flex flex-column gap-3"><div><h2 className="h5 mb-1">{locale === 'ar' ? 'بطاقات التراخيص الصادرة' : locale === 'en' ? 'Issued license cards' : 'Cartes de licence délivrées'}</h2><p className="text-muted mb-0">{locale === 'ar' ? 'معاينة نفس البطاقة الرقمية التي يراها صاحب الترخيص في فضائه الخاص.' : locale === 'en' ? 'Preview the same digital card shown to the license holder in their private hub.' : 'Aperçu de la même carte numérique que le licencié consulte dans son espace privé.'}</p></div>{error ? <div className="alert alert-danger mb-0">{error}</div> : issued.length === 0 ? <p className="text-muted mb-0">{locale === 'ar' ? 'لا توجد بطاقة صادرة بعد.' : locale === 'en' ? 'No card has been issued yet.' : 'Aucune carte n’a encore été délivrée.'}</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,390px),1fr))', gap: 20, alignItems: 'start' }}>{issued.slice(0, 12).map((license) => <FederationLicenseCard key={license.id} license={license} holderName={license.personName} locale={cardLocale} />)}</div>}</div></section>
  </div>
}
