import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react'
import { emptyForm } from './constants'
import type { Federation, FederationFormState } from './types'

export function useAdminFederations() {
  const [federations, setFederations] = useState<Federation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<FederationFormState>(emptyForm)
  const [editForm, setEditForm] = useState<FederationFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [uploadingCreate, setUploadingCreate] = useState(false)
  const [uploadingEdit, setUploadingEdit] = useState(false)
  const [viewingLogo, setViewingLogo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFederations()
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

  const filteredAndSortedFederations = useMemo(() => {
    let filtered = federations

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = federations.filter(
        (fed) =>
          fed.code.toLowerCase().includes(query) ||
          fed.nom.toLowerCase().includes(query) ||
          fed.nom_en?.toLowerCase().includes(query) ||
          fed.nom_ar?.toLowerCase().includes(query)
      )
    }

    return filtered.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))
  }, [federations, searchQuery])

  async function loadFederations() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/federations', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error ?? `Impossible de charger les fédérations (${response.status})`
        throw new Error(message)
      }
      const data = (await response.json()) as Federation[]
      setFederations(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange =
    (formSetter: Dispatch<SetStateAction<FederationFormState>>) => (fileList: FileList | null) => {
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
        const uploadRes = await fetch('/api/uploads/federation', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!uploadRes.ok) {
          throw new Error('Échec du téléchargement de la photo')
        }
        const uploadData = await uploadRes.json()
        logoUrl = uploadData.url
      }

      const response = await fetch('/api/admin/federations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: createForm.code,
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
      await loadFederations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setUploadingCreate(false)
    }
  }

  function startEdit(federation: Federation) {
    setEditingId(federation.id)
    setEditForm({
      code: federation.code,
      nom: federation.nom,
      nom_en: federation.nom_en || '',
      nom_ar: federation.nom_ar || '',
      logoFile: null,
      logo_url: federation.logo_url || '',
    })
    // Réinitialiser l'erreur d'image pour cette fédération
    setImageErrors((prev) => {
      const newSet = new Set(prev)
      newSet.delete(federation.id)
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
        const uploadRes = await fetch('/api/uploads/federation', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!uploadRes.ok) {
          throw new Error('Échec du téléchargement de la photo')
        }
        const uploadData = await uploadRes.json()
        logoUrl = uploadData.url
      }

      const response = await fetch(`/api/admin/federations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: editForm.code,
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
      await loadFederations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setUploadingEdit(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette fédération ?')) return
    setError(null)
    try {
      const response = await fetch(`/api/admin/federations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Suppression impossible')
      }
      await loadFederations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  async function handleToggleActive(fed: Federation, newStatus: boolean) {
    // Mettre à jour l'état local immédiatement pour un feedback visuel
    setFederations((prev) =>
      prev.map((f) => (f.id === fed.id ? { ...f, is_active: newStatus } : f))
    )
    try {
      setError(null)
      const response = await fetch(`/api/admin/federations/${fed.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: newStatus }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Impossible de modifier le statut')
      }
      // Recharger pour s'assurer de la synchronisation
      await loadFederations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification du statut')
      // Recharger pour restaurer l'état précédent en cas d'erreur
      await loadFederations()
    }
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
    imageErrors,
    setImageErrors,
    filteredAndSortedFederations,
    handleFileChange,
    handleCreate,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleDelete,
    handleToggleActive,
  }
}
