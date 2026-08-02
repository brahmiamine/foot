import { useEffect, useMemo, useRef, useState } from 'react'
import type { Team, TeamType, Sport, AgeCategory } from '@/types'
import { emptyForm } from './constants'
import type { FilterOptions, ImportResult, TeamFormState } from './types'

function buildEdit(team: Team): TeamFormState {
  return {
    nom: team.nom || '',
    nom_en: team.nom_en || '',
    nom_ar: team.nom_ar || '',
    abbr: team.abbr || '',
    team_type: team.team_type || 'club',
    country_code: team.country_code || '',
    sport: team.sport || 'football',
    age_category: team.age_category || 'seniors',
    city: team.city || '',
    city_en: team.city_en || '',
    city_ar: team.city_ar || '',
    stadium: team.stadium || '',
    stadium_ar: team.stadium_ar || '',
    logo_url: team.logo_url || '',
  }
}

export function useAdminTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<TeamFormState>(emptyForm)
  const [editForm, setEditForm] = useState<TeamFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Import
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTeamType, setFilterTeamType] = useState<TeamType | 'all'>('all')
  const [filterSport, setFilterSport] = useState<Sport | 'all'>('all')
  const [filterAgeCategory, setFilterAgeCategory] = useState<AgeCategory | 'all'>('all')
  const [filterCountry, setFilterCountry] = useState<string>('all')

  useEffect(() => {
    loadData()
    loadFilterOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recharger les données quand les filtres changent
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTeamType, filterSport, filterAgeCategory, filterCountry])

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams

    const query = searchQuery.toLowerCase().trim()
    return teams.filter(
      (team) =>
        team.nom.toLowerCase().includes(query) ||
        team.nom_en?.toLowerCase().includes(query) ||
        team.nom_ar?.toLowerCase().includes(query) ||
        team.abbr?.toLowerCase().includes(query) ||
        team.city?.toLowerCase().includes(query)
    )
  }, [teams, searchQuery])

  async function loadFilterOptions() {
    try {
      const response = await fetch('/api/admin/teams?getFilterOptions=true', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setFilterOptions(data)
      }
    } catch (err) {
      console.error('Error loading filter options:', err)
    }
  }

  async function loadData() {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (filterTeamType !== 'all') params.set('team_type', filterTeamType)
      if (filterSport !== 'all') params.set('sport', filterSport)
      if (filterAgeCategory !== 'all') params.set('age_category', filterAgeCategory)
      if (filterCountry !== 'all') params.set('country_code', filterCountry)

      const response = await fetch(`/api/admin/teams?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les équipes')
      }

      const data = await response.json()
      setTeams(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (team: Team) => {
    setEditingId(team.id)
    setEditForm(buildEdit(team))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)

    try {
      const payload = {
        nom: createForm.nom.trim(),
        nom_en: createForm.nom_en.trim() || null,
        nom_ar: createForm.nom_ar.trim() || null,
        abbr: createForm.abbr.trim() || null,
        team_type: createForm.team_type,
        country_code: createForm.country_code || null,
        sport: createForm.sport,
        age_category: createForm.age_category,
        city: createForm.city.trim() || null,
        city_en: createForm.city_en.trim() || null,
        city_ar: createForm.city_ar.trim() || null,
        stadium: createForm.stadium.trim() || null,
        stadium_ar: createForm.stadium_ar.trim() || null,
        logo_url: createForm.logo_url.trim() || null,
      }

      const response = await fetch('/api/admin/teams', {
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
      await loadFilterOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setError(null)
    setSavingId(editingId)

    try {
      const payload = {
        nom: editForm.nom.trim(),
        nom_en: editForm.nom_en.trim() || null,
        nom_ar: editForm.nom_ar.trim() || null,
        abbr: editForm.abbr.trim() || null,
        team_type: editForm.team_type,
        country_code: editForm.country_code || null,
        sport: editForm.sport,
        age_category: editForm.age_category,
        city: editForm.city.trim() || null,
        city_en: editForm.city_en.trim() || null,
        city_ar: editForm.city_ar.trim() || null,
        stadium: editForm.stadium.trim() || null,
        stadium_ar: editForm.stadium_ar.trim() || null,
        logo_url: editForm.logo_url.trim() || null,
      }

      const response = await fetch(`/api/admin/teams/${editingId}`, {
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
      await loadFilterOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return
    setError(null)
    setDeletingId(id)

    try {
      const response = await fetch(`/api/admin/teams/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      if (editingId === id) {
        setEditingId(null)
        setEditForm(emptyForm)
      }
      await loadData()
      await loadFilterOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleImport(file: File) {
    setError(null)
    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      let jsonData: unknown

      try {
        jsonData = JSON.parse(text)
      } catch {
        throw new Error('Le fichier JSON est invalide')
      }

      // Si le fichier est un tableau direct, on le wrappe
      const payload = Array.isArray(jsonData) ? { teams: jsonData } : jsonData

      const response = await fetch('/api/admin/teams/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'import')
      }

      setImportResult(data)

      // Recharger les données si des équipes ont été importées
      if (data.imported > 0) {
        await loadData()
        await loadFilterOptions()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleImport(file)
    }
  }

  function closeImportModal() {
    setShowImportModal(false)
    setImportResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function downloadSampleJson() {
    const sample = {
      teams: [
        {
          nom: "Exemple Équipe",
          nom_en: "Example Team",
          nom_ar: "فريق مثال",
          abbr: "EXE",
          team_type: "club",
          country_code: "TUN",
          sport: "football",
          age_category: "seniors",
          city: "Tunis",
          city_en: "Tunis",
          stadium: "Stade Exemple"
        }
      ]
    }

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'equipes-sample.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    teams,
    filterOptions,
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
    showImportModal,
    setShowImportModal,
    importing,
    importResult,
    fileInputRef,
    searchQuery,
    setSearchQuery,
    filterTeamType,
    setFilterTeamType,
    filterSport,
    setFilterSport,
    filterAgeCategory,
    setFilterAgeCategory,
    filterCountry,
    setFilterCountry,
    filteredTeams,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleFileSelect,
    closeImportModal,
    downloadSampleJson,
  }
}
