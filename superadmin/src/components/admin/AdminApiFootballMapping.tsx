'use client'

import { Fragment, useEffect, useState } from 'react'
import type { Match, Team } from '@/types'

type Tab = 'teams' | 'matches'

interface ApiFootballTeamResult {
  id: number
  name: string
  logo: string
  country: string | null
}

interface ApiFootballFixtureResult {
  id: number
  date: string
  statusShort: string
  homeTeam: string
  awayTeam: string
  leagueName: string
}

/**
 * Écran de mapping API-Football (/admin/api-football) : associe chaque
 * équipe/match local à son id API-Football (teams.api_football_id,
 * matches.api_football_fixture_id), pour que la synchro live
 * (/api/cron/live-scores, voir superadmin/src/lib/liveScoreSync.ts) sache
 * quel fixture interroger. Volontairement 100% manuel — jamais de
 * rapprochement automatique par nom (voir superadmin/matching.md : les noms
 * libres divergent trop souvent entre les deux systèmes pour être fiables).
 * Saisie directe de l'id toujours possible, même sans API_FOOTBALL_KEY
 * configuré : seule la recherche assistée dépend de la clé.
 */
export default function AdminApiFootballMapping() {
  const [tab, setTab] = useState<Tab>('teams')

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="mb-1">Mapping API-Football</h2>
        <p className="text-muted mb-0">
          Associez chaque équipe/match local à son identifiant API-Football pour activer la synchro du
          score live sur les matchs non couverts par une feuille de match (kiosque matchsheet). Vous
          choisissez toujours vous-même l&apos;équipe ou le fixture proposé, ou saisissez l&apos;id à la main.
        </p>
      </div>

      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'teams' ? 'active' : ''}`}
            onClick={() => setTab('teams')}
          >
            Équipes
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'matches' ? 'active' : ''}`}
            onClick={() => setTab('matches')}
          >
            Matchs
          </button>
        </li>
      </ul>

      {tab === 'teams' ? <TeamsMappingPanel /> : <MatchesMappingPanel />}
    </div>
  )
}

function parseOptionalId(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

// ── Équipes ──────────────────────────────────────────────────────────────

function TeamsMappingPanel() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [searchOpenId, setSearchOpenId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<ApiFootballTeamResult[]>([])

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/teams', { cache: 'no-store', credentials: 'include' })
      if (!response.ok) throw new Error('Impossible de charger les équipes')
      const data: Team[] = await response.json()
      setTeams(data)
      setDrafts(Object.fromEntries(data.map((team) => [team.id, team.api_football_id?.toString() ?? ''])))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  async function saveMapping(teamId: string, apiFootballId: number | null) {
    setError(null)
    setSavingId(teamId)
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ api_football_id: apiFootballId }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors de l'enregistrement")
      }
      await loadTeams()
      setSearchOpenId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSavingId(null)
    }
  }

  function openSearch(teamId: string, prefill: string) {
    setSearchOpenId((current) => (current === teamId ? null : teamId))
    setSearchQuery(prefill)
    setSearchResults([])
    setSearchError(null)
  }

  async function runSearch() {
    if (searchQuery.trim().length < 3) {
      setSearchError('Recherche trop courte (3 caractères minimum).')
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    try {
      const response = await fetch(
        `/api/admin/api-football/search?type=teams&query=${encodeURIComponent(searchQuery.trim())}`,
        { credentials: 'include' }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Recherche impossible')
      setSearchResults(data.results ?? [])
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Recherche impossible')
    } finally {
      setSearchLoading(false)
    }
  }

  if (loading) {
    return <p className="text-muted">Chargement…</p>
  }

  return (
    <div className="d-flex flex-column gap-3">
      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Équipe</th>
                <th>Pays</th>
                <th style={{ width: '220px' }}>Id API-Football</th>
                <th style={{ width: '160px' }}></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <Fragment key={team.id}>
                  <tr>
                    <td>
                      <span className="fw-medium">{team.nom}</span>
                      {team.abbr && <span className="text-muted ms-2 small">({team.abbr})</span>}
                    </td>
                    <td className="text-muted small">{team.country_code ?? '—'}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="ex: 2154"
                        value={drafts[team.id] ?? ''}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [team.id]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={savingId === team.id}
                        onClick={() => saveMapping(team.id, parseOptionalId(drafts[team.id] ?? ''))}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openSearch(team.id, team.nom)}
                      >
                        Rechercher
                      </button>
                    </td>
                  </tr>
                  {searchOpenId === team.id && (
                    <tr>
                      <td colSpan={4} className="bg-body-tertiary">
                        <div className="d-flex flex-column gap-2 py-2">
                          <div className="d-flex gap-2">
                            <input
                              type="text"
                              className="form-control form-control-sm w-auto"
                              value={searchQuery}
                              onChange={(event) => setSearchQuery(event.target.value)}
                              placeholder="nom de l'équipe (3 caractères min.)"
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={searchLoading}
                              onClick={runSearch}
                            >
                              {searchLoading ? 'Recherche…' : 'Rechercher sur API-Football'}
                            </button>
                          </div>
                          {searchError && <div className="text-danger small">{searchError}</div>}
                          {searchResults.length > 0 && (
                            <ul className="list-group">
                              {searchResults.map((result) => (
                                <li
                                  key={result.id}
                                  className="list-group-item d-flex align-items-center justify-content-between gap-2"
                                >
                                  <span>
                                    {result.name}{' '}
                                    <span className="text-muted small">
                                      ({result.country ?? '?'} — id {result.id})
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    disabled={savingId === team.id}
                                    onClick={() => saveMapping(team.id, result.id)}
                                  >
                                    Utiliser cet id
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Matchs ───────────────────────────────────────────────────────────────

function MatchesMappingPanel() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [searchOpenId, setSearchOpenId] = useState<string | null>(null)
  const [searchDate, setSearchDate] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<ApiFootballFixtureResult[]>([])

  useEffect(() => {
    loadMatches()
  }, [])

  async function loadMatches() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/matches?limit=100', { cache: 'no-store', credentials: 'include' })
      if (!response.ok) throw new Error('Impossible de charger les matchs')
      const data: Match[] = await response.json()
      setMatches(data)
      setDrafts(
        Object.fromEntries(data.map((match) => [match.id, match.api_football_fixture_id?.toString() ?? '']))
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  async function saveMapping(matchId: string, fixtureId: number | null) {
    setError(null)
    setSavingId(matchId)
    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ api_football_fixture_id: fixtureId }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors de l'enregistrement")
      }
      await loadMatches()
      setSearchOpenId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSavingId(null)
    }
  }

  function openSearch(matchId: string, matchDate: string | null) {
    setSearchOpenId((current) => (current === matchId ? null : matchId))
    setSearchDate(matchDate ? matchDate.slice(0, 10) : '')
    setSearchResults([])
    setSearchError(null)
  }

  async function runDateSearch() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(searchDate)) {
      setSearchError('Date invalide (format attendu AAAA-MM-JJ).')
      return
    }
    await runSearch(`/api/admin/api-football/search?type=fixtures&date=${searchDate}`)
  }

  async function runLiveSearch() {
    await runSearch('/api/admin/api-football/search?type=fixtures&live=all')
  }

  async function runSearch(url: string) {
    setSearchLoading(true)
    setSearchError(null)
    try {
      const response = await fetch(url, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Recherche impossible')
      setSearchResults(data.results ?? [])
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Recherche impossible')
    } finally {
      setSearchLoading(false)
    }
  }

  if (loading) {
    return <p className="text-muted">Chargement…</p>
  }

  return (
    <div className="d-flex flex-column gap-3">
      <p className="text-muted small mb-0">
        Le plan gratuit d&apos;API-Football ne donne pas accès au calendrier de la saison en cours : la
        recherche par date peut ne rien renvoyer pour un match à venir. Une fois le match commencé,
        utilisez « Matchs en direct » pour retrouver son fixture, ou saisissez l&apos;id manuellement si
        vous le connaissez déjà.
      </p>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Match</th>
                <th style={{ width: '220px' }}>Fixture API-Football</th>
                <th style={{ width: '160px' }}></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <Fragment key={match.id}>
                  <tr>
                    <td className="text-muted small">
                      {match.date ? new Date(match.date).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td>
                      {match.equipe_home?.nom ?? '?'} <span className="text-muted">vs</span>{' '}
                      {match.equipe_away?.nom ?? '?'}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="ex: 1035048"
                        value={drafts[match.id] ?? ''}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [match.id]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={savingId === match.id}
                        onClick={() => saveMapping(match.id, parseOptionalId(drafts[match.id] ?? ''))}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openSearch(match.id, match.date)}
                      >
                        Rechercher
                      </button>
                    </td>
                  </tr>
                  {searchOpenId === match.id && (
                    <tr>
                      <td colSpan={4} className="bg-body-tertiary">
                        <div className="d-flex flex-column gap-2 py-2">
                          <div className="d-flex gap-2 flex-wrap align-items-center">
                            <input
                              type="date"
                              className="form-control form-control-sm w-auto"
                              value={searchDate}
                              onChange={(event) => setSearchDate(event.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={searchLoading}
                              onClick={runDateSearch}
                            >
                              {searchLoading ? 'Recherche…' : 'Rechercher à cette date'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={searchLoading}
                              onClick={runLiveSearch}
                            >
                              Matchs en direct
                            </button>
                          </div>
                          {searchError && <div className="text-danger small">{searchError}</div>}
                          {searchResults.length > 0 && (
                            <ul className="list-group">
                              {searchResults.map((result) => (
                                <li
                                  key={result.id}
                                  className="list-group-item d-flex align-items-center justify-content-between gap-2"
                                >
                                  <span>
                                    {result.homeTeam} vs {result.awayTeam}{' '}
                                    <span className="text-muted small">
                                      ({result.leagueName} — {result.statusShort} — id {result.id})
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    disabled={savingId === match.id}
                                    onClick={() => saveMapping(match.id, result.id)}
                                  >
                                    Utiliser cet id
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
