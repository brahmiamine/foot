'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { statusBadge, formatFixtureDate, FINISHED_STATUSES } from '@/lib/footballDisplay'

export interface Fixture {
  fixture: {
    id: number
    date: string
    status: { long: string; short: string; elapsed: number | null }
  }
  league: { round: string; season?: number; name?: string; country?: string; logo?: string }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
}

export interface StandingRow {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  form: string | null
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
}

interface Props {
  initialFixtures: Fixture[]
  initialStandings: StandingRow[]
  season: number
}

type Tab = 'direct' | 'calendrier' | 'classement'

function roundNumber(round: string): number {
  const match = round.match(/(\d+)\s*$/)
  return match ? Number(match[1]) : 0
}

function FixtureRow({ fixture, showLeague }: { fixture: Fixture; showLeague?: boolean }) {
  const badge = statusBadge(fixture.fixture.status)
  const hasScore = fixture.goals.home !== null && fixture.goals.away !== null

  return (
    <Link
      href={`/testapi/${fixture.fixture.id}`}
      className="flex flex-col gap-1 py-3 px-3 sm:px-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
    >
      {showLeague && (fixture.league.name || fixture.league.country) && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          {fixture.league.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fixture.league.logo} alt="" className="w-3.5 h-3.5" />
          )}
          <span>
            {fixture.league.country ? `${fixture.league.country} — ` : ''}
            {fixture.league.name}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3">
      <div className="text-xs text-gray-400 dark:text-gray-500 w-24 shrink-0 hidden sm:block">
        {formatFixtureDate(fixture.fixture.date)}
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 justify-end text-right min-w-0">
          <span className={`truncate text-sm ${fixture.teams.home.winner ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            {fixture.teams.home.name}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fixture.teams.home.logo} alt="" className="w-5 h-5 shrink-0" />
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums px-2 whitespace-nowrap">
          {hasScore ? `${fixture.goals.home} - ${fixture.goals.away}` : formatFixtureDate(fixture.fixture.date).split(' ').slice(-2).join(' ')}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fixture.teams.away.logo} alt="" className="w-5 h-5 shrink-0" />
          <span className={`truncate text-sm ${fixture.teams.away.winner ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            {fixture.teams.away.name}
          </span>
        </div>
      </div>
      <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${badge.className}`}>{badge.label}</span>
      </div>
    </Link>
  )
}

export default function TunisiaFootballClient({ initialFixtures, initialStandings, season }: Props) {
  const [tab, setTab] = useState<Tab>('direct')
  const [liveFixtures, setLiveFixtures] = useState<Fixture[]>([])
  const [liveScope, setLiveScope] = useState<'tunisia' | 'world'>('tunisia')
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/testapi?action=live')
        const payload = await res.json()
        if (!cancelled && res.ok) {
          setLiveFixtures(payload.fixtures ?? [])
          setLiveScope(payload.scope === 'world' ? 'world' : 'tunisia')
          setLiveError(null)
        } else if (!cancelled) {
          setLiveError(payload.error || 'Impossible de charger le direct')
        }
      } catch {
        if (!cancelled) setLiveError('Impossible de charger le direct')
      } finally {
        if (!cancelled) setLiveLoading(false)
      }
    }

    fetchLive()
    const interval = setInterval(fetchLive, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const rounds = useMemo(() => {
    const map = new Map<string, Fixture[]>()
    for (const fixture of initialFixtures) {
      const key = fixture.league.round
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(fixture)
    }
    return Array.from(map.entries()).sort((a, b) => roundNumber(a[0]) - roundNumber(b[0]))
  }, [initialFixtures])

  const defaultRoundIndex = useMemo(() => {
    const lastPlayedIndex = rounds.reduce((acc, [, fixtures], index) => {
      const hasFinished = fixtures.some((f) => FINISHED_STATUSES.has(f.fixture.status.short))
      return hasFinished ? index : acc
    }, 0)
    return lastPlayedIndex
  }, [rounds])

  const [roundIndex, setRoundIndex] = useState(defaultRoundIndex)

  useEffect(() => {
    setRoundIndex(defaultRoundIndex)
  }, [defaultRoundIndex])

  const currentRound = rounds[roundIndex]

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-md p-3">
        Le plan Free d&apos;API-Football ne donne accès qu&apos;aux saisons passées (calendrier et classement ci-dessous :
        saison {season}-{season + 1}). Le direct fonctionne en revanche en temps réel, dès qu&apos;un match Ligue 1
        Tunisie est en cours.
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {([
          ['direct', 'En direct'],
          ['calendrier', 'Calendrier'],
          ['classement', 'Classement'],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'direct' && (
        <div className="space-y-2">
          {!liveLoading && !liveError && liveFixtures.length > 0 && liveScope === 'world' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs rounded-md p-3">
              Aucun match Ligue 1 Tunisie en direct pour le moment — voici les matchs en direct ailleurs dans le
              monde (pour voir le fonctionnement du direct et du détail de match en plan Free).
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden">
            {liveLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-6 text-center">Chargement…</p>
            ) : liveError ? (
              <p className="text-sm text-red-600 p-6 text-center">{liveError}</p>
            ) : liveFixtures.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-6 text-center">
                Aucun match en direct actuellement, ni en Tunisie ni ailleurs. Rafraîchi automatiquement toutes les
                30s.
              </p>
            ) : (
              liveFixtures.map((fixture) => (
                <FixtureRow key={fixture.fixture.id} fixture={fixture} showLeague={liveScope === 'world'} />
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'calendrier' && (
        <div className="space-y-3">
          {rounds.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée de calendrier disponible.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setRoundIndex((i) => Math.max(0, i - 1))}
                  disabled={roundIndex === 0}
                  className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300"
                >
                  ← Précédente
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{currentRound?.[0]}</span>
                <button
                  onClick={() => setRoundIndex((i) => Math.min(rounds.length - 1, i + 1))}
                  disabled={roundIndex === rounds.length - 1}
                  className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300"
                >
                  Suivante →
                </button>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden">
                {currentRound?.[1].map((fixture) => <FixtureRow key={fixture.fixture.id} fixture={fixture} />)}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'classement' && (
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="py-2 px-3 font-medium">#</th>
                <th className="py-2 px-3 font-medium">Équipe</th>
                <th className="py-2 px-3 font-medium text-center">J</th>
                <th className="py-2 px-3 font-medium text-center">G</th>
                <th className="py-2 px-3 font-medium text-center">N</th>
                <th className="py-2 px-3 font-medium text-center">P</th>
                <th className="py-2 px-3 font-medium text-center">BP</th>
                <th className="py-2 px-3 font-medium text-center">BC</th>
                <th className="py-2 px-3 font-medium text-center">Diff</th>
                <th className="py-2 px-3 font-medium text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {initialStandings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-gray-500 dark:text-gray-400">
                    Aucun classement disponible.
                  </td>
                </tr>
              ) : (
                initialStandings.map((row) => (
                  <tr key={row.team.id} className="border-b border-gray-50 dark:border-gray-800 last:border-b-0">
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{row.rank}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.team.logo} alt="" className="w-5 h-5 shrink-0" />
                        <span className="truncate text-gray-900 dark:text-white">{row.team.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{row.all.played}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{row.all.win}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{row.all.draw}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{row.all.lose}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{row.all.goals.for}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{row.all.goals.against}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{row.goalsDiff}</td>
                    <td className="py-2 px-3 text-center font-semibold text-gray-900 dark:text-white">{row.points}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
