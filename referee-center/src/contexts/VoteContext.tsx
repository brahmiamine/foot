'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import type { Vote } from '@/types'

interface VoteContextValue {
  fingerprint: string | null
  hasVoted: (matchId: string) => boolean // Toujours dynamique depuis la DB
  getUserVote: (matchId: string) => Promise<Vote | null> // Appel direct à la DB
  votedMatchIds: Set<string> // Set des matchIds votés (chargé une fois au démarrage)
  isLoading: boolean
  refreshVotedMatches: () => Promise<void> // Recharger la liste des matchs votés
}

const VoteContext = createContext<VoteContextValue>({
  fingerprint: null,
  hasVoted: () => false,
  getUserVote: async () => null,
  votedMatchIds: new Set(),
  isLoading: false,
  refreshVotedMatches: async () => {},
})

export function VoteProvider({ children }: { children: ReactNode }) {
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [votedMatchIds, setVotedMatchIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Récupérer le fingerprint une seule fois
  useEffect(() => {
    let cancelled = false
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        if (!cancelled) {
          setFingerprint(result.visitorId)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFingerprint(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Charger tous les matchs votés en une seule requête au démarrage
  const loadVotedMatches = useCallback(async () => {
    if (!fingerprint) {
      setVotedMatchIds(new Set())
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/votes/user/${fingerprint}/matches`)
      if (response.ok) {
        const data = await response.json()
        setVotedMatchIds(new Set(data.matchIds || []))
      } else {
        setVotedMatchIds(new Set())
      }
    } catch (error) {
      console.error('Error loading voted matches:', error)
      setVotedMatchIds(new Set())
    } finally {
      setIsLoading(false)
    }
  }, [fingerprint])

  // Charger les matchs votés quand le fingerprint est disponible
  useEffect(() => {
    if (fingerprint) {
      loadVotedMatches()
    }
  }, [fingerprint, loadVotedMatches])

  // Vérifier si l'utilisateur a voté (dynamique depuis le Set chargé)
  const hasVoted = useCallback(
    (matchId: string): boolean => {
      return votedMatchIds.has(matchId)
    },
    [votedMatchIds]
  )

  // Récupérer le vote d'un match (appel direct à la DB, pas de cache)
  const getUserVote = useCallback(
    async (matchId: string): Promise<Vote | null> => {
      if (!fingerprint) {
        return null
      }

      try {
        const response = await fetch(`/api/votes/${matchId}/user?fingerprint=${fingerprint}`)
        if (response.ok) {
          return await response.json()
        } else if (response.status === 404) {
          return null
        } else {
          console.error('Error fetching user vote:', response.status)
          return null
        }
      } catch (error) {
        console.error('Error fetching user vote:', error)
        return null
      }
    },
    [fingerprint]
  )

  // Recharger la liste des matchs votés (après un nouveau vote par exemple)
  const refreshVotedMatches = useCallback(async () => {
    await loadVotedMatches()
  }, [loadVotedMatches])

  return (
    <VoteContext.Provider
      value={{
        fingerprint,
        hasVoted,
        getUserVote,
        votedMatchIds,
        isLoading,
        refreshVotedMatches,
      }}
    >
      {children}
    </VoteContext.Provider>
  )
}

export function useVote() {
  return useContext(VoteContext)
}

