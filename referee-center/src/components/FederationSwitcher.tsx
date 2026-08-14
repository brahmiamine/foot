'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useFederationContext } from './FederationContext'
import { getLocalizedName } from '@/lib/utils'

type Variant = 'light' | 'dark' | 'admin'

interface Props {
  variant?: Variant
}

export default function FederationSwitcher({ variant = 'light' }: Props) {
  const { federations, activeLeagueId, isSwitching, switchLeague } = useFederationContext()
  const { t, locale } = useTranslations()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDark = variant === 'dark'
  const isAdmin = variant === 'admin'

  useEffect(() => {
    if (!open) {
      return
    }
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  const activeLeague = useMemo(() => {
    for (const federation of federations) {
      const league = federation.leagues.find((l) => l.id === activeLeagueId)
      if (league) {
        return league
      }
    }
    return null
  }, [federations, activeLeagueId])

  if (federations.length === 0) {
    return null
  }

  const activeLeagueLabel = activeLeague
    ? getLocalizedName(locale, {
        defaultValue: activeLeague.nom,
        fr: activeLeague.nom,
        en: activeLeague.nom_en ?? activeLeague.nom,
        ar: activeLeague.nom_ar ?? activeLeague.nom,
      })
    : t('federationSwitcher.noSelection')

  const buttonClasses = isDark
    ? 'flex w-full items-center justify-between rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30'
    : isAdmin
      ? 'inline-flex items-center gap-1 sm:gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm'
      : 'inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'

  const dropdownClasses = isDark
    ? 'absolute right-0 z-[70] mt-2 w-80 sm:w-96 rounded-lg border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl max-h-[80vh] overflow-y-auto'
    : 'absolute right-0 z-[70] mt-2 w-80 sm:w-96 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl max-h-[80vh] overflow-y-auto'

  const sectionTitleClass = isDark
    ? 'text-xs uppercase tracking-wide text-slate-400'
    : 'text-xs uppercase tracking-wide text-gray-500'
  const federationLabelClass = isDark
    ? 'text-xs font-semibold uppercase text-slate-400 mb-1'
    : 'text-xs font-semibold uppercase text-gray-500 mb-1'
  const leagueButtonActive = isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'
  const leagueButtonInactive = isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
  const tagClass = isDark ? 'text-blue-300' : 'text-blue-600'
  const emptyLeaguesClass = isDark ? 'text-xs text-slate-500' : 'text-xs text-gray-400'
  const activeLeagueLabelClass = isDark ? 'text-slate-50' : isAdmin ? 'text-gray-900' : 'text-gray-900'

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className={buttonClasses} aria-expanded={open}>
        <span className="flex-1 text-left min-w-0 hidden sm:block">
          <span className="block truncate max-w-[120px] sm:max-w-none">{activeLeagueLabel}</span>
        </span>
        <span className="sm:hidden text-xs">Ligue</span>
        <svg
          className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 transition-transform ${open ? 'translate-y-0.5 rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 011.04 1.08l-4.23 3.823a.75.75 0 01-1.04 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className={dropdownClasses}>
          <div className="p-4 space-y-4 text-sm">
            <div>
              <p className={sectionTitleClass}>{t('federationSwitcher.title')}</p>
              <p className={`mt-1 font-semibold break-words ${activeLeagueLabelClass}`}>{activeLeagueLabel}</p>
              {isSwitching && (
                <p className="text-xs text-blue-400 animate-pulse mt-1">
                  {t('federationSwitcher.switching')}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className={sectionTitleClass}>{t('federationSwitcher.leagues')}</p>
              <div className="space-y-4">
                {federations.map((federation) => {
                  const federationLabel = getLocalizedName(locale, {
                    defaultValue: federation.nom,
                    fr: federation.nom,
                    en: federation.nom_en ?? federation.nom,
                    ar: federation.nom_ar ?? federation.nom,
                  })
                  return (
                    <div key={federation.id} className="space-y-2">
                      <p className={`${federationLabelClass} break-words`}>{federationLabel}</p>
                      {federation.leagues.length === 0 ? (
                        <p className={emptyLeaguesClass}>{t('federationSwitcher.noLeagues')}</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {federation.leagues.map((league) => {
                            const label = getLocalizedName(locale, {
                              defaultValue: league.nom,
                              fr: league.nom,
                              en: league.nom_en ?? league.nom,
                              ar: league.nom_ar ?? league.nom,
                            })
                            const isActive = league.id === activeLeagueId
                            return (
                              <button
                                key={league.id}
                                type="button"
                                onClick={() => {
                                  switchLeague(league.id)
                                  setOpen(false)
                                }}
                                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                                  isActive ? leagueButtonActive : leagueButtonInactive
                                }`}
                              >
                                <span className="flex-1 min-w-0 break-words">{label}</span>
                                {isActive && (
                                  <span className={`text-xs font-medium whitespace-nowrap flex-shrink-0 ${tagClass}`}>
                                    {t('federationSwitcher.selected')}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
