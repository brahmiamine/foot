'use client'

import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { League } from '@/types'

export interface FederationOption {
  id: string
  code: string
  nom: string
  nom_en?: string | null
  nom_ar?: string | null
  logo_url?: string | null
  is_active?: boolean
  leagues: League[]
}

interface FederationContextValue {
  federations: FederationOption[]
  activeLeagueId: string | null
  isSwitching: boolean
  switchLeague: (leagueId: string) => Promise<void>
}

const FederationContext = createContext<FederationContextValue | undefined>(undefined)

interface ProviderProps {
  federations: FederationOption[]
  initialLeagueId: string | null
  children: React.ReactNode
}

export function FederationProvider({ federations, initialLeagueId, children }: ProviderProps) {
  const router = useRouter()
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(initialLeagueId ?? null)
  const [isSwitching, setIsSwitching] = useState(false)

  const switchLeague = useCallback(async (leagueId: string) => {
    if (!leagueId || leagueId === activeLeagueId) {
      return
    }
    setIsSwitching(true)
    try {
      const response = await fetch('/api/preferences/league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_id: leagueId }),
      })
      if (!response.ok) {
        throw new Error('Failed to update league')
      }
      setActiveLeagueId(leagueId)
      router.refresh()
    } catch (error) {
      console.error('Failed to switch league', error)
    } finally {
      setIsSwitching(false)
    }
  }, [activeLeagueId, router])

  const value = useMemo<FederationContextValue>(
    () => ({
      federations,
      activeLeagueId,
      isSwitching,
      switchLeague,
    }),
    [federations, activeLeagueId, isSwitching, switchLeague]
  )

  return <FederationContext.Provider value={value}>{children}</FederationContext.Provider>
}

export function useFederationContext() {
  const context = useContext(FederationContext)
  if (!context) {
    throw new Error('useFederationContext must be used within a FederationProvider')
  }
  return context
}


