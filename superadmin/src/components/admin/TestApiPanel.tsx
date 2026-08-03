'use client'

import { useState } from 'react'
import { API_FOOTBALL_ENDPOINTS, type ApiFootballEndpoint } from '@/lib/apiFootball'

interface ParamRow {
  key: string
  value: string
}

interface Preset {
  label: string
  endpoint: ApiFootballEndpoint
  params: ParamRow[]
}

const PRESETS: Preset[] = [
  { label: 'Statut du compte / quota', endpoint: 'status', params: [] },
  { label: 'Ligues en Tunisie', endpoint: 'leagues', params: [{ key: 'country', value: 'Tunisia' }] },
  { label: 'Matchs en direct (tous)', endpoint: 'fixtures', params: [{ key: 'live', value: 'all' }] },
  {
    label: 'Fixtures Ligue 1 Tunisie (saison 2025)',
    endpoint: 'fixtures',
    params: [
      { key: 'league', value: '' },
      { key: 'season', value: '2025' },
    ],
  },
  {
    label: 'Classement (league + season requis)',
    endpoint: 'standings',
    params: [
      { key: 'league', value: '' },
      { key: 'season', value: '2025' },
    ],
  },
]

export default function TestApiPanel() {
  const [endpoint, setEndpoint] = useState<ApiFootballEndpoint>('status')
  const [params, setParams] = useState<ParamRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    status: number
    ok: boolean
    rateLimit: { limitDay: string | null; remainingDay: string | null }
    body: unknown
  } | null>(null)
  const [requestUrl, setRequestUrl] = useState<string | null>(null)

  const applyPreset = (preset: Preset) => {
    setEndpoint(preset.endpoint)
    setParams(preset.params)
    setError(null)
    setResult(null)
  }

  const updateParam = (index: number, field: 'key' | 'value', value: string) => {
    setParams((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const removeParam = (index: number) => {
    setParams((prev) => prev.filter((_, i) => i !== index))
  }

  const addParam = () => {
    setParams((prev) => [...prev, { key: '', value: '' }])
  }

  const runRequest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    const search = new URLSearchParams()
    search.set('endpoint', endpoint)
    for (const { key, value } of params) {
      if (key.trim()) search.set(key.trim(), value)
    }

    const url = `/api/admin/testapi?${search.toString()}`
    setRequestUrl(url)

    try {
      const response = await fetch(url)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || `Erreur ${response.status}`)
      }
      setResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Requête impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="mb-1">Test API-Football</h2>
        <p className="text-muted mb-0">
          Interface interne pour explorer les endpoints v3.football.api-sports.io sans consommer le
          quota depuis un terminal. La clé reste côté serveur (jamais envoyée au navigateur).
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="mb-3">
            <p className="fw-medium mb-2">Raccourcis</p>
            <div className="d-flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Endpoint</label>
            <select
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value as ApiFootballEndpoint)}
              className="form-select"
            >
              {API_FOOTBALL_ENDPOINTS.map((ep) => (
                <option key={ep} value={ep}>
                  /{ep}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Paramètres</label>
            <div className="d-flex flex-column gap-2">
              {params.map((row, index) => (
                <div key={index} className="d-flex gap-2">
                  <input
                    type="text"
                    placeholder="clé (ex: league)"
                    value={row.key}
                    onChange={(event) => updateParam(index, 'key', event.target.value)}
                    className="form-control form-control-sm w-auto"
                  />
                  <input
                    type="text"
                    placeholder="valeur"
                    value={row.value}
                    onChange={(event) => updateParam(index, 'value', event.target.value)}
                    className="form-control form-control-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeParam(index)}
                    className="btn btn-sm btn-link text-danger p-0 px-2"
                    aria-label="Supprimer le paramètre"
                  >
                    <i className="bx bx-x" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addParam}
                className="btn btn-sm btn-link text-primary p-0"
              >
                <i className="bx bx-plus me-1" aria-hidden="true" />
                ajouter un paramètre
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={runRequest}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Requête en cours…
              </>
            ) : (
              'Envoyer la requête'
            )}
          </button>

          {requestUrl && (
            <p className="text-muted small font-monospace text-break mt-3 mb-0">GET {requestUrl}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      {result && (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
              <span className={`badge rounded-pill ${result.ok ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                HTTP {result.status}
              </span>
              {result.rateLimit?.remainingDay !== null && (
                <span className="text-muted small">
                  Quota restant aujourd&apos;hui : {result.rateLimit.remainingDay} / {result.rateLimit.limitDay}
                </span>
              )}
            </div>
            <pre className="bg-light border rounded p-3 small mb-0" style={{ overflow: 'auto', maxHeight: '32rem' }}>
              {JSON.stringify(result.body, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
