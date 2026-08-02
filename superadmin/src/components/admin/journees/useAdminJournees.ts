import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Journee, Saison } from '@/types'
import { useTranslations } from '@/lib/i18n'
import { getJourneeDisplayName } from '@/lib/utils'
import { buildForm, emptyForm } from './constants'
import type { JourneeForm } from './types'

export function useAdminJournees() {
  const { locale } = useTranslations()
  const [journees, setJournees] = useState<Journee[]>([])
  const [saisons, setSaisons] = useState<Saison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<JourneeForm>(emptyForm)
  const [editForm, setEditForm] = useState<JourneeForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSaisonId, setFilterSaisonId] = useState<string>('')

  const filteredAndSortedJournees = useMemo(() => {
    let filtered = journees

    // Filtre par saison
    if (filterSaisonId) {
      filtered = filtered.filter((journee) => journee.saison_id === filterSaisonId)
    }

    // Filtre par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((journee) => {
        const label = getJourneeDisplayName(journee, locale).toLowerCase()
        const saisonNom = journee.saison?.nom?.toLowerCase() || ''
        return label.includes(query) || saisonNom.includes(query)
      })
    }

    return filtered.sort((a, b) => {
      // Trier par numéro si disponible (ordre croissant : 1, 2, 3...)
      if (a.numero !== null && a.numero !== undefined && b.numero !== null && b.numero !== undefined) {
        return a.numero - b.numero
      }
      if (a.numero !== null && a.numero !== undefined) return -1
      if (b.numero !== null && b.numero !== undefined) return 1
      // Si les deux ont un nom, trier par nom (ordre alphabétique)
      if (a.nom_fr && b.nom_fr) {
        return a.nom_fr.localeCompare(b.nom_fr)
      }
      if (a.nom_fr) return -1
      if (b.nom_fr) return 1
      return 0
    })
  }, [journees, searchQuery, filterSaisonId])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [journeesRes, saisonsRes] = await Promise.all([
        fetch('/api/admin/journees', {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch('/api/admin/saisons', {
          cache: 'no-store',
          credentials: 'include',
        }),
      ])

      if (!journeesRes.ok) {
        const payload = await journeesRes.json().catch(() => null)
        throw new Error(payload?.error ?? 'Impossible de charger les journées')
      }

      if (!saisonsRes.ok) {
        const payload = await saisonsRes.json().catch(() => null)
        throw new Error(payload?.error ?? 'Impossible de charger les saisons')
      }

      const journeesData = (await journeesRes.json()) as Journee[]
      const saisonsData = (await saisonsRes.json()) as Saison[]

      setJournees(journeesData)
      setSaisons(saisonsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(journee: Journee) {
    setEditingId(journee.id)
    setEditForm(buildForm(journee))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!createForm.saison_id) {
      setError('Veuillez sélectionner une saison')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const payload = {
        saison_id: createForm.saison_id,
        numero: createForm.numero ? parseInt(createForm.numero, 10) : null,
        nom_fr: createForm.nom_fr || null,
        nom_en: createForm.nom_en || null,
        nom_ar: createForm.nom_ar || null,
        date_journee: createForm.date_journee || null,
      }

      const response = await fetch('/api/admin/journees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Création impossible')
      }

      setCreateForm(emptyForm)
      setShowCreateForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return

    setSavingId(editingId)
    setError(null)

    try {
      const payload = {
        saison_id: editForm.saison_id || undefined,
        numero: editForm.numero ? parseInt(editForm.numero, 10) : null,
        nom_fr: editForm.nom_fr || null,
        nom_en: editForm.nom_en || null,
        nom_ar: editForm.nom_ar || null,
        date_journee: editForm.date_journee || null,
      }

      const response = await fetch(`/api/admin/journees/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Sauvegarde impossible')
      }

      setEditingId(null)
      setEditForm(emptyForm)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    const journee = journees.find((j) => j.id === id)
    if (!journee) return

    const label = getJourneeDisplayName(journee, locale)
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${label} ?`)) return

    setDeletingId(id)
    setError(null)

    try {
      const response = await fetch(`/api/admin/journees/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Suppression impossible')
      }

      if (editingId === id) {
        setEditingId(null)
        setEditForm(emptyForm)
      }
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return {
    journees,
    saisons,
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
    filterSaisonId,
    setFilterSaisonId,
    filteredAndSortedJournees,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
