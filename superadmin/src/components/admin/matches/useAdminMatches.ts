import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import type { Match, Journee, Arbitre, Team } from '@/types'
import type { Locale } from '@/i18n/request'
import { buildEdit, buildNewForm } from './utils'
import type { MatchEdit, NewMatchForm, SaisonOption } from './types'

export function useAdminMatches() {
  const locale = useLocale() as Locale
  const [matches, setMatches] = useState<Match[]>([])
  const [journees, setJournees] = useState<Journee[]>([])
  const [arbitres, setArbitres] = useState<Arbitre[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [edits, setEdits] = useState<Record<string, MatchEdit>>({})
  const [newForm, setNewForm] = useState<NewMatchForm>(buildNewForm(''))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [selectedSaisonId, setSelectedSaisonId] = useState<string>('')
  const [selectedJourneeId, setSelectedJourneeId] = useState<string>('')

  const sortedSaisons = useMemo(() => {
    const bySaisonId = new Map<string, SaisonOption>()
    journees.forEach((journee) => {
      const saisonId = journee.saison?.id
      if (!saisonId || bySaisonId.has(saisonId)) return
      bySaisonId.set(saisonId, {
        id: saisonId,
        nom: journee.saison?.nom ?? 'Sans saison',
        leagueNom: journee.saison?.league?.nom ?? 'Sans ligue',
      })
    })
    return Array.from(bySaisonId.values()).sort((a, b) => {
      if (a.leagueNom !== b.leagueNom) return a.leagueNom.localeCompare(b.leagueNom)
      return a.nom.localeCompare(b.nom)
    })
  }, [journees])

  const sortedJournees = useMemo(() => {
    return [...journees].sort((a, b) => {
      // Trier par ligue, puis saison, puis numéro/nom
      const aLeague = a.saison?.league?.nom ?? ''
      const bLeague = b.saison?.league?.nom ?? ''
      if (aLeague !== bLeague) return aLeague.localeCompare(bLeague)

      const aSaison = a.saison?.nom ?? ''
      const bSaison = b.saison?.nom ?? ''
      if (aSaison !== bSaison) return aSaison.localeCompare(bSaison)

      // Trier par numéro de journée en ordre croissant (1, 2, 3...)
      if (typeof a.numero === 'number' && typeof b.numero === 'number') {
        return a.numero - b.numero
      }
      if (typeof a.numero === 'number') return -1
      if (typeof b.numero === 'number') return 1
      // Si les deux n'ont pas de numero, trier par nom
      const aNom = a.nom_fr ?? ''
      const bNom = b.nom_fr ?? ''
      return aNom.localeCompare(bNom)
    })
  }, [journees])

  const journeesOfSelectedSaison = useMemo(() => {
    if (!selectedSaisonId) return sortedJournees
    return sortedJournees.filter((journee) => journee.saison?.id === selectedSaisonId)
  }, [sortedJournees, selectedSaisonId])

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })
  }, [matches])

  useEffect(() => {
    loadJournees()
    loadArbitres()
    loadTeams()
  }, [])

  useEffect(() => {
    // Sélectionner automatiquement la première saison si disponible
    if (sortedSaisons.length > 0 && !selectedSaisonId) {
      setSelectedSaisonId(sortedSaisons[0].id)
    }
  }, [sortedSaisons, selectedSaisonId])

  useEffect(() => {
    // Sélectionner automatiquement la première journée de la saison sélectionnée
    // (ou re-sélectionner si la journée courante n'appartient plus à cette saison)
    if (journeesOfSelectedSaison.length === 0) return
    const stillValid = journeesOfSelectedSaison.some((journee) => journee.id === selectedJourneeId)
    if (!stillValid) {
      setSelectedJourneeId(journeesOfSelectedSaison[0].id)
    }
  }, [journeesOfSelectedSaison, selectedJourneeId])

  useEffect(() => {
    if (selectedJourneeId) {
      loadMatches()
      setNewForm(buildNewForm(selectedJourneeId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJourneeId])

  async function loadJournees() {
    try {
      const response = await fetch('/api/admin/journees', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (response.ok) {
        const data = (await response.json()) as Journee[]
        setJournees(data)
      }
    } catch (err) {
      console.error('Error loading journees:', err)
    }
  }

  async function loadArbitres() {
    try {
      const response = await fetch('/api/admin/arbitres', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (response.ok) {
        const data = (await response.json()) as Arbitre[]
        setArbitres(data)
      }
    } catch (err) {
      console.error('Error loading arbitres:', err)
    }
  }

  async function loadTeams() {
    try {
      const response = await fetch('/api/admin/teams', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (response.ok) {
        const data = (await response.json()) as Team[]
        setTeams(data)
      }
    } catch (err) {
      console.error('Error loading teams:', err)
    }
  }

  async function loadMatches() {
    if (!selectedJourneeId) {
      setMatches([])
      setEdits({})
      return
    }

    try {
      setLoading(true)
      const url = `/api/admin/matches?limit=100&journeeId=${selectedJourneeId}`
      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Impossible de charger les matchs')
      }
      const data = (await response.json()) as Match[]
      setMatches(data)
      const nextEdits: Record<string, MatchEdit> = {}
      data.forEach((match) => {
        nextEdits[match.id] = buildEdit(match)
      })
      setEdits(nextEdits)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function updateEdit(matchId: string, field: keyof MatchEdit, value: string) {
    setEdits((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }))
  }

  function hasChanges(match: Match) {
    const baseline = buildEdit(match)
    const current = edits[match.id]
    if (!current) return false
    // Normaliser les valeurs vides pour la comparaison
    const baselineArbitreId = baseline.arbitre_id || ''
    const currentArbitreId = current.arbitre_id || ''
    const baselineEquipeHome = baseline.equipe_home || ''
    const currentEquipeHome = current.equipe_home || ''
    const baselineEquipeAway = baseline.equipe_away || ''
    const currentEquipeAway = current.equipe_away || ''
    return (
      baseline.score_home !== current.score_home ||
      baseline.score_away !== current.score_away ||
      baseline.date !== current.date ||
      baselineArbitreId !== currentArbitreId ||
      baselineEquipeHome !== currentEquipeHome ||
      baselineEquipeAway !== currentEquipeAway
    )
  }

  async function handleSave(match: Match) {
    const edit = edits[match.id]
    if (!edit) return
    setSavingId(match.id)
    try {
      // Construire le payload avec tous les champs modifiables
      // Gérer le score 0 comme valeur valide
      const parseScore = (value: string): number | null => {
        if (value === '' || value === null || value === undefined) {
          return null
        }
        const num = Number(value)
        return Number.isFinite(num) ? num : null
      }

      const payload = {
        score_home: parseScore(edit.score_home),
        score_away: parseScore(edit.score_away),
        date: edit.date || null,
        arbitre_id: edit.arbitre_id === '' ? null : (edit.arbitre_id || null),
        equipe_home: edit.equipe_home === '' ? null : (edit.equipe_home || null),
        equipe_away: edit.equipe_away === '' ? null : (edit.equipe_away || null),
      }

      const response = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Sauvegarde impossible')
      }

      const updatedMatch = await response.json()

      // Mettre à jour le match dans l'état
      setMatches((prev) => prev.map((m) => (m.id === match.id ? updatedMatch : m)))

      // Mettre à jour les edits avec les nouvelles données
      setEdits((prev) => ({
        ...prev,
        [match.id]: buildEdit(updatedMatch),
      }))
    } catch (err) {
      console.error('Error saving match:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSavingId(null)
    }
  }

  async function handleCreate() {
    if (!newForm.journee_id || !newForm.equipe_home || !newForm.equipe_away) {
      setError('Veuillez remplir tous les champs obligatoires (journée, équipe à domicile, équipe à l\'extérieur)')
      return
    }

    if (newForm.equipe_home === newForm.equipe_away) {
      setError('Les deux équipes doivent être différentes')
      return
    }

    setCreating(true)
    try {
      const parseScore = (value: string): number | null => {
        if (value === '' || value === null || value === undefined) {
          return null
        }
        const num = Number(value)
        return Number.isFinite(num) ? num : null
      }

      const payload = {
        journee_id: newForm.journee_id,
        equipe_home: newForm.equipe_home,
        equipe_away: newForm.equipe_away,
        date: newForm.date || null,
        score_home: parseScore(newForm.score_home),
        score_away: parseScore(newForm.score_away),
        arbitre_id: newForm.arbitre_id === '' ? null : (newForm.arbitre_id || null),
      }

      const response = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Création impossible')
      }

      const newMatch = await response.json()

      // Ajouter le nouveau match à la liste
      setMatches((prev) => [...prev, newMatch])

      // Ajouter les edits pour le nouveau match
      setEdits((prev) => ({
        ...prev,
        [newMatch.id]: buildEdit(newMatch),
      }))

      // Réinitialiser le formulaire
      setNewForm(buildNewForm(selectedJourneeId))
      setShowNewForm(false)
      setError(null)
    } catch (err) {
      console.error('Error creating match:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(match: Match) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce match ?`)) {
      return
    }

    setDeletingId(match.id)
    try {
      const response = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Suppression impossible')
      }

      // Retirer le match de la liste
      setMatches((prev) => prev.filter((m) => m.id !== match.id))

      // Retirer les edits
      setEdits((prev) => {
        const next = { ...prev }
        delete next[match.id]
        return next
      })

      setError(null)
    } catch (err) {
      console.error('Error deleting match:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return {
    locale,
    matches,
    journees,
    arbitres,
    teams,
    edits,
    newForm,
    setNewForm,
    loading,
    error,
    savingId,
    creating,
    deletingId,
    showNewForm,
    setShowNewForm,
    selectedSaisonId,
    setSelectedSaisonId,
    selectedJourneeId,
    setSelectedJourneeId,
    sortedSaisons,
    sortedJournees,
    journeesOfSelectedSaison,
    sortedMatches,
    loadMatches,
    updateEdit,
    hasChanges,
    handleSave,
    handleCreate,
    handleDelete,
  }
}
