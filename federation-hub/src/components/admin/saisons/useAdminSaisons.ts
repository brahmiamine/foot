import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Saison, League, Federation } from '@/types'
import { emptyForm, toDateInputValue } from './constants'
import type { SaisonFormState } from './types'

function buildEdit(saison: Saison): SaisonFormState {
  return {
    nom: saison.nom || '',
    type_competition: saison.type_competition || 'championnat',
    date_debut: toDateInputValue(saison.date_debut),
    date_fin: toDateInputValue(saison.date_fin),
    league_id: saison.league_id || '',
  }
}

export function useAdminSaisons() {
  const [saisons, setSaisons] = useState<Saison[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [federations, setFederations] = useState<Federation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<SaisonFormState>(emptyForm)
  const [editForm, setEditForm] = useState<SaisonFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterFederationId, setFilterFederationId] = useState<string>('')
  const [filterLeagueId, setFilterLeagueId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  // Filtrer les ligues par fédération sélectionnée
  const filteredLeagues = useMemo(() => {
    if (!filterFederationId) return leagues
    return leagues.filter((league) => league.federation_id === filterFederationId)
  }, [leagues, filterFederationId])

  // Réinitialiser le filtre de ligue si la fédération change et la ligue n'est plus dans la liste
  useEffect(() => {
    if (filterLeagueId && filterFederationId) {
      const leagueStillValid = filteredLeagues.some((l) => l.id === filterLeagueId)
      if (!leagueStillValid) {
        setFilterLeagueId('')
      }
    }
  }, [filterFederationId, filteredLeagues, filterLeagueId])

  const filteredAndSortedSaisons = useMemo(() => {
    let filtered = saisons

    // Filtre par type de compétition
    if (filterType) {
      filtered = filtered.filter((saison) => saison.type_competition === filterType)
    }

    // Filtre par fédération (via la ligue)
    if (filterFederationId) {
      filtered = filtered.filter((saison) => saison.league?.federation_id === filterFederationId)
    }

    // Filtre par ligue
    if (filterLeagueId) {
      filtered = filtered.filter((saison) => saison.league_id === filterLeagueId)
    }

    // Filtre par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (saison) =>
          saison.nom.toLowerCase().includes(query) ||
          saison.league?.nom?.toLowerCase().includes(query)
      )
    }

    return filtered.sort((a, b) => {
      // Trier par date de début (plus récent en premier)
      const dateA = a.date_debut ? new Date(a.date_debut).getTime() : 0
      const dateB = b.date_debut ? new Date(b.date_debut).getTime() : 0
      return dateB - dateA
    })
  }, [saisons, searchQuery, filterType, filterFederationId, filterLeagueId])

  async function loadData() {
    try {
      setLoading(true)
      const [saisonsRes, leaguesRes, federationsRes] = await Promise.all([
        fetch('/api/admin/saisons', {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch('/api/admin/leagues', {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch('/api/admin/federations', {
          cache: 'no-store',
          credentials: 'include',
        }),
      ])

      if (!saisonsRes.ok || !leaguesRes.ok || !federationsRes.ok) {
        throw new Error('Impossible de charger les données')
      }

      const [saisonsData, leaguesData, federationsData] = await Promise.all([
        saisonsRes.json(),
        leaguesRes.json(),
        federationsRes.json(),
      ])

      setSaisons(saisonsData)
      setLeagues(leaguesData)
      setFederations(federationsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (saison: Saison) => {
    setEditingId(saison.id)
    setEditForm(buildEdit(saison))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)

    try {
      const payload = {
        nom: createForm.nom.trim(),
        type_competition: createForm.type_competition,
        date_debut: createForm.date_debut || null,
        date_fin: createForm.date_fin || null,
        league_id: createForm.league_id || null,
      }

      const response = await fetch('/api/admin/saisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setCreateForm(emptyForm)
      setShowCreateForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setError(null)
    setSavingId(editingId)

    try {
      const payload = {
        nom: editForm.nom.trim(),
        type_competition: editForm.type_competition,
        date_debut: editForm.date_debut || null,
        date_fin: editForm.date_fin || null,
        league_id: editForm.league_id || null,
      }

      const response = await fetch(`/api/admin/saisons/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }

      setEditingId(null)
      setEditForm(emptyForm)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette saison ?')) return
    setError(null)
    setDeletingId(id)

    try {
      const response = await fetch(`/api/admin/saisons/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      // Si on supprime la saison en cours d'édition, annuler l'édition
      if (editingId === id) {
        setEditingId(null)
        setEditForm(emptyForm)
      }
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDeletingId(null)
    }
  }

  return {
    leagues,
    federations,
    loading,
    error,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingId,
    showCreateForm,
    setShowCreateForm,
    savingId,
    creating,
    deletingId,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterFederationId,
    setFilterFederationId,
    filterLeagueId,
    setFilterLeagueId,
    filteredLeagues,
    filteredAndSortedSaisons,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
