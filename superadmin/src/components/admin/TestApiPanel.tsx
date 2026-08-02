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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Test API-Football</h1>
        <p className="text-sm text-gray-500 mt-1">
          Interface interne pour explorer les endpoints v3.football.api-sports.io sans consommer le
          quota depuis un terminal. La clé reste côté serveur (jamais envoyée au navigateur).
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Raccourcis</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
          <select
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value as ApiFootballEndpoint)}
            className="form-control"
          >
            {API_FOOTBALL_ENDPOINTS.map((ep) => (
              <option key={ep} value={ep}>
                /{ep}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paramètres</label>
          <div className="space-y-2">
            {params.map((row, index) => (
              <div key={index} className="flex gap-2">
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
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addParam}
              className="btn btn-sm btn-link text-primary p-0"
            >
              + ajouter un paramètre
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={runRequest}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Requête en cours…' : 'Envoyer la requête'}
        </button>

        {requestUrl && (
          <p className="text-xs text-gray-400 font-mono break-all">GET {requestUrl}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white shadow rounded-lg p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className={`font-medium ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
              HTTP {result.status}
            </span>
            {result.rateLimit?.remainingDay !== null && (
              <span className="text-gray-500">
                Quota restant aujourd&apos;hui : {result.rateLimit.remainingDay} / {result.rateLimit.limitDay}
              </span>
            )}
          </div>
          <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-auto max-h-[32rem]">
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
