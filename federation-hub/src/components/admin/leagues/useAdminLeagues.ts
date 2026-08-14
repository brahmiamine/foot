import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react'
import { emptyForm } from './constants'
import type { Federation, League, LeagueFormState } from './types'

export function useAdminLeagues() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [federations, setFederations] = useState<Federation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<LeagueFormState>(emptyForm)
  const [editForm, setEditForm] = useState<LeagueFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [uploadingCreate, setUploadingCreate] = useState(false)
  const [uploadingEdit, setUploadingEdit] = useState(false)
  const [viewingLogo, setViewingLogo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFederationId, setFilterFederationId] = useState<string>('')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (viewingLogo) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setViewingLogo(null)
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [viewingLogo])

  async function loadData() {
    try {
      setLoading(true)
      const [leaguesRes, federationsRes] = await Promise.all([
        fetch('/api/admin/leagues', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/federations', { cache: 'no-store', credentials: 'include' }),
      ])

      if (!leaguesRes.ok || !federationsRes.ok) {
        throw new Error('Impossible de charger les données')
      }

      const [leaguesData, federationsData] = await Promise.all([
        leaguesRes.json(),
        federationsRes.json(),
      ])

      setLeagues(leaguesData)
      setFederations(federationsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedLeagues = useMemo(() => {
    let filtered = leagues

    // Filtre par fédération
    if (filterFederationId) {
      filtered = filtered.filter((league) => league.federation_id === filterFederationId)
    }

    // Filtre par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (league) =>
          league.nom.toLowerCase().includes(query) ||
          league.nom_en?.toLowerCase().includes(query) ||
          league.nom_ar?.toLowerCase().includes(query) ||
          league.federation?.nom.toLowerCase().includes(query)
      )
    }

    return filtered.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))
  }, [leagues, searchQuery, filterFederationId])

  const handleFileChange =
    (formSetter: Dispatch<SetStateAction<LeagueFormState>>) => (fileList: FileList | null) => {
      if (fileList && fileList.length > 0) {
        const file = fileList[0]
        if (!file.type.startsWith('image/')) {
          setError('Le fichier doit être une image')
          return
        }
        formSetter((prev) => ({ ...prev, logoFile: file }))
      }
    }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setUploadingCreate(true)

    try {
      let logoUrl = createForm.logo_url

      if (createForm.logoFile) {
        const formData = new FormData()
        formData.append('file', createForm.logoFile)
        const uploadRes = await fetch('/api/uploads/league', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!uploadRes.ok) {
          throw new Error('Échec du téléchargement du logo')
        }
        const uploadData = await uploadRes.json()
        logoUrl = uploadData.url
      }

      const response = await fetch('/api/admin/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          federation_id: createForm.federation_id,
          nom: createForm.nom,
          nom_en: createForm.nom_en || null,
          nom_ar: createForm.nom_ar || null,
          logo_url: logoUrl,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Création impossible')
      }
      setShowCreateModal(false)
      setCreateForm({ ...emptyForm })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setUploadingCreate(false)
    }
  }

  function startEdit(league: League) {
    setEditingId(league.id)
    setEditForm({
      federation_id: league.federation_id,
      nom: league.nom,
      nom_en: league.nom_en || '',
      nom_ar: league.nom_ar || '',
      logoFile: null,
      logo_url: league.logo_url || '',
    })
    // Réinitialiser l'erreur d'image pour cette ligue
    setImageErrors((prev) => {
      const newSet = new Set(prev)
      newSet.delete(league.id)
      return newSet
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ ...emptyForm })
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setError(null)
    setUploadingEdit(true)

    try {
      let logoUrl = editForm.logo_url

      if (editForm.logoFile) {
        const formData = new FormData()
        formData.append('file', editForm.logoFile)
        const uploadRes = await fetch('/api/uploads/league', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!uploadRes.ok) {
          throw new Error('Échec du téléchargement du logo')
        }
        const uploadData = await uploadRes.json()
        logoUrl = uploadData.url
      }

      const response = await fetch(`/api/admin/leagues/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          federation_id: editForm.federation_id,
          nom: editForm.nom,
          nom_en: editForm.nom_en || null,
          nom_ar: editForm.nom_ar || null,
          logo_url: logoUrl,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Mise à jour impossible')
      }
      setEditingId(null)
      setEditForm({ ...emptyForm })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setUploadingEdit(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ligue ?')) return
    setError(null)
    try {
      const response = await fetch(`/api/admin/leagues/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Suppression impossible')
      }
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  async function handleToggleActive(e: ChangeEvent<HTMLInputElement>, league: League) {
    const federation = federations.find((f) => f.id === league.federation_id)
    const isFederationActive = federation?.is_active !== false
    const isLeagueActive = league.is_active ?? true

    const newStatus = e.target.checked
    const oldStatus = isLeagueActive
    console.log('Toggle league:', league.id, 'from', oldStatus, 'to', newStatus)

    // Vérifier si on peut activer (si la fédération n'est pas active)
    if (newStatus && !isFederationActive) {
      setError('Impossible d\'activer une ligue dont la fédération est désactivée')
      // Remettre le switch à sa position précédente
      e.target.checked = oldStatus
      return
    }

    // Mettre à jour l'état local immédiatement pour un feedback visuel
    setLeagues((prev) =>
      prev.map((l) => (l.id === league.id ? { ...l, is_active: newStatus } : l))
    )

    try {
      setError(null)
      console.log('Sending PATCH request with is_active:', newStatus)
      const response = await fetch(`/api/admin/leagues/${league.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: newStatus }),
      })

      const responseData = await response.json()
      console.log('API response:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || 'Impossible de modifier le statut')
      }

      // Mettre à jour avec les données confirmées de l'API
      const confirmedStatus = responseData.league?.is_active ?? responseData.is_active ?? newStatus
      console.log('Confirmed status:', confirmedStatus)

      // Mettre à jour l'état avec la valeur confirmée
      setLeagues((prev) =>
        prev.map((l) => (l.id === league.id ? { ...l, is_active: confirmedStatus } : l))
      )

      // Ne pas recharger automatiquement pour éviter de restaurer l'ancien état
      // Le rechargement se fera seulement en cas d'erreur
    } catch (err) {
      console.error('Error toggling league:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification du statut')
      // Remettre le switch à sa position précédente en cas d'erreur
      e.target.checked = oldStatus
      // Recharger pour restaurer l'état précédent
      await loadData()
    }
  }

  function markImageError(id: string) {
    setImageErrors((prev) => new Set(prev).add(id))
  }

  return {
    federations,
    loading,
    error,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingId,
    showCreateModal,
    setShowCreateModal,
    uploadingCreate,
    uploadingEdit,
    viewingLogo,
    setViewingLogo,
    searchQuery,
    setSearchQuery,
    filterFederationId,
    setFilterFederationId,
    imageErrors,
    filteredAndSortedLeagues,
    handleFileChange,
    handleCreate,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    markImageError,
  }
}
