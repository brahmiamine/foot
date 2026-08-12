'use client'

import { useEffect, useState } from 'react'

interface TeamBrandingPanelProps {
  teamId: string
}

interface BrandingState {
  faviconUrl: string
  icon192Url: string
  icon512Url: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  font: string
}

const EMPTY: BrandingState = {
  faviconUrl: '',
  icon192Url: '',
  icon512Url: '',
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  font: '',
}

/**
 * Identité visuelle du club (ClubBranding), résolue dynamiquement par les
 * apps génériques (teamManager, sellerPortal, ...) à partir du teamId — voir
 * README racine, section « Classification des projets ». Panneau indépendant
 * du formulaire d'équipe : table/endpoint séparés (team_branding), pas de
 * couplage avec la mise à jour du référentiel équipe.
 */
export default function TeamBrandingPanel({ teamId }: TeamBrandingPanelProps) {
  const [form, setForm] = useState<BrandingState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSaved(false)

    fetch(`/api/admin/teams/${teamId}/branding`)
      .then((res) => {
        if (!res.ok) throw new Error('Chargement du branding impossible')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setForm({
          faviconUrl: data.faviconUrl ?? '',
          icon192Url: data.icon192Url ?? '',
          icon512Url: data.icon512Url ?? '',
          primaryColor: data.primaryColor ?? '',
          secondaryColor: data.secondaryColor ?? '',
          accentColor: data.accentColor ?? '',
          font: data.font ?? '',
        })
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faviconUrl: form.faviconUrl || null,
          icon192Url: form.icon192Url || null,
          icon512Url: form.icon512Url || null,
          primaryColor: form.primaryColor || null,
          secondaryColor: form.secondaryColor || null,
          accentColor: form.accentColor || null,
          font: form.font || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Enregistrement impossible')
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="col-12 col-lg-4">
      <div className="card border border-secondary">
        <div className="card-header bg-transparent">
          <h5 className="card-title mb-0">Identité visuelle (ClubBranding)</h5>
          <p className="text-muted small mb-0">
            Logo et nom viennent du référentiel équipe ci-contre. Ces champs pilotent le thème résolu dynamiquement
            par teamManager/sellerPortal pour ce club.
          </p>
        </div>
        <div className="card-body">
          {loading ? (
            <p className="text-muted mb-0">Chargement...</p>
          ) : (
            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-12">
                <label className="form-label">Favicon (URL)</label>
                <input
                  type="url"
                  value={form.faviconUrl}
                  onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                  className="form-control"
                  placeholder="https://..."
                />
              </div>
              <div className="col-6">
                <label className="form-label">Icône PWA 192×192 (URL)</label>
                <input
                  type="url"
                  value={form.icon192Url}
                  onChange={(e) => setForm({ ...form, icon192Url: e.target.value })}
                  className="form-control"
                  placeholder="https://... (PNG 192x192)"
                />
              </div>
              <div className="col-6">
                <label className="form-label">Icône PWA 512×512 (URL)</label>
                <input
                  type="url"
                  value={form.icon512Url}
                  onChange={(e) => setForm({ ...form, icon512Url: e.target.value })}
                  className="form-control"
                  placeholder="https://... (PNG 512x512)"
                />
              </div>
              <div className="col-4">
                <label className="form-label">Couleur principale</label>
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="form-control"
                  placeholder="#c8102e"
                />
              </div>
              <div className="col-4">
                <label className="form-label">Couleur secondaire</label>
                <input
                  type="text"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="form-control"
                  placeholder="#0d0d0d"
                />
              </div>
              <div className="col-4">
                <label className="form-label">Couleur d&apos;accent</label>
                <input
                  type="text"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="form-control"
                  placeholder="#f5f2ee"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Police</label>
                <input
                  type="text"
                  value={form.font}
                  onChange={(e) => setForm({ ...form, font: e.target.value })}
                  className="form-control"
                  placeholder="system-ui, ..."
                />
              </div>
              {error && <div className="col-12"><div className="alert alert-danger mb-0 py-2">{error}</div></div>}
              {saved && !error && <div className="col-12"><div className="alert alert-success mb-0 py-2">Branding enregistré.</div></div>}
              <div className="col-12">
                <button type="submit" className="btn btn-secondary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer le branding'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
