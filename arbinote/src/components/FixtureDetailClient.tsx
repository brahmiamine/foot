'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { FixtureEvent, FixtureInfo, FixtureLineup } from '@/lib/apiFootball'
import { statusBadge, formatFixtureDate, eventIcon, LIVE_STATUSES } from '@/lib/footballDisplay'

interface Props {
  fixture: FixtureInfo
  events: FixtureEvent[]
  lineups: FixtureLineup[]
}

export default function FixtureDetailClient({ fixture, events, lineups }: Props) {
  const router = useRouter()
  const isLive = LIVE_STATUSES.has(fixture.fixture.status.short)

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(interval)
  }, [isLive, router])

  const badge = statusBadge(fixture.fixture.status)
  const home = lineups.find((l) => l.team.id === fixture.teams.home.id)
  const away = lineups.find((l) => l.team.id === fixture.teams.away.id)
  const sortedEvents = [...events].sort((a, b) => a.time.elapsed - b.time.elapsed)

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fixture.league.logo} alt="" className="w-4 h-4" />
          <span>
            {fixture.league.country} — {fixture.league.name}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>{formatFixtureDate(fixture.fixture.date)}</span>
          <span className={`font-medium px-2 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fixture.teams.home.logo} alt="" className="w-12 h-12" />
            <span className="text-sm font-medium text-gray-900 dark:text-white text-center">{fixture.teams.home.name}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums px-4">
            {fixture.goals.home ?? '-'} - {fixture.goals.away ?? '-'}
          </div>
          <div className="flex flex-col items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fixture.teams.away.logo} alt="" className="w-12 h-12" />
            <span className="text-sm font-medium text-gray-900 dark:text-white text-center">{fixture.teams.away.name}</span>
          </div>
        </div>
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {fixture.league.round}
          {fixture.fixture.venue.name ? ` · ${fixture.fixture.venue.name}` : ''}
          {fixture.fixture.referee ? ` · Arbitre : ${fixture.fixture.referee}` : ''}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Faits de match</h2>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucun événement disponible pour ce match.</p>
        ) : (
          <ul className="space-y-2">
            {sortedEvents.map((event, index) => {
              const isHome = event.team.id === fixture.teams.home.id
              return (
                <li
                  key={index}
                  className={`flex items-center gap-2 text-sm ${isHome ? '' : 'flex-row-reverse text-right'}`}
                >
                  <span className="text-xs text-gray-400 w-10 shrink-0 tabular-nums">
                    {event.time.elapsed}
                    {event.time.extra ? `+${event.time.extra}` : ''}&apos;
                  </span>
                  <span>{eventIcon(event.type, event.detail)}</span>
                  <span className="text-gray-800 dark:text-gray-200 truncate">
                    {event.player.name}
                    {event.assist.name ? ` (${event.assist.name})` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {(home || away) && (
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Compositions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[home, away].map((lineup, index) =>
              lineup ? (
                <div key={lineup.team.id}>
                  <div className="flex items-center gap-2 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lineup.team.logo} alt="" className="w-5 h-5" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{lineup.team.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                    Entraîneur : {lineup.coach.name}
                    {lineup.formation ? ` · ${lineup.formation}` : ''}
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Titulaires</p>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5 mb-3">
                    {lineup.startXI.map((p) => (
                      <li key={p.player.id}>{p.player.name}</li>
                    ))}
                  </ul>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Remplaçants</p>
                  <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
                    {lineup.substitutes.map((p) => (
                      <li key={p.player.id}>{p.player.name}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div key={index} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
