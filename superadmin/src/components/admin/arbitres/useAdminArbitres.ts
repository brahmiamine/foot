import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react'
import type { Arbitre } from '@/types'
import { emptyForm } from './constants'
import type { ArbitreFormState } from './types'

export function useAdminArbitres() {
  const [arbitres, setArbitres] = useState<Arbitre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<ArbitreFormState>(emptyForm)
  const [editForm, setEditForm] = useState<ArbitreFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [uploadingCreate, setUploadingCreate] = useState(false)
  const [uploadingEdit, setUploadingEdit] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadArbitres()
  }, [])

  useEffect(() => {
    if (viewingPhoto) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setViewingPhoto(null)
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [viewingPhoto])

  const filteredAndSortedArbitres = useMemo(() => {
    let filtered = arbitres

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = arbitres.filter(
        (arbitre) =>
          arbitre.nom.toLowerCase().includes(query) ||
          arbitre.nom_en?.toLowerCase().includes(query) ||
          arbitre.nom_ar?.toLowerCase().includes(query)
      )
    }

    // Trier par nom
    return filtered.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))
  }, [arbitres, searchQuery])

  async function loadArbitres() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/arbitres', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error ?? `Impossible de charger les arbitres (${response.status})`
        throw new Error(message)
      }
      const data = (await response.json()) as Arbitre[]
      setArbitres(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange =
    (formSetter: Dispatch<SetStateAction<ArbitreFormState>>) => (fileList: FileList | null) => {
      if (fileList && fileList.length > 0) {
        const file = fileList[0]
        if (!file.type.startsWith('image/')) {
          setError('Le fichier doit être une image')
          return
        }
        formSetter((prev) => ({ ...prev, photoFile: file }))
      }
    }

  const startEdit = (arbitre: Arbitre) => {
    setEditingId(arbitre.id)
    setEditForm({
      nom: arbitre.nom,
      nom_en: arbitre.nom_en || '',
      nom_ar: arbitre.nom_ar || '',
      date_naissance: arbitre.date_naissance
        ? new Date(arbitre.date_naissance).toISOString().split('T')[0]
        : '',
      photoFile: null,
      photo_url: arbitre.photo_url || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...emptyForm })
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setUploadingCreate(true)
    try {
      let photoUrl = null
      if (createForm.photoFile) {
        const formData = new FormData()
        formData.append('file', createForm.photoFile)
        const uploadResponse = await fetch('/api/uploads/arbitre', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        if (!uploadResponse.ok) {
          throw new Error('Échec du téléchargement de la photo')
        }
        const uploadData = await uploadResponse.json()
        photoUrl = uploadData.url
      }

      const response = await fetch('/api/admin/arbitres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: createForm.nom,
          nom_en: createForm.nom_en || null,
          nom_ar: createForm.nom_ar || null,
          date_naissance: createForm.date_naissance || null,
          photo_url: photoUrl,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Création impossible')
      }
      setCreateForm({ ...emptyForm })
      setShowCreateModal(false)
      await loadArbitres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setUploadingCreate(false)
    }
  }

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingId) return
    setError(null)
    setUploadingEdit(true)
    try {
      let photoUrl = editForm.photo_url
      if (editForm.photoFile) {
        const formData = new FormData()
        formData.append('file', editForm.photoFile)
        const uploadResponse = await fetch('/api/uploads/arbitre', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        if (!uploadResponse.ok) {
          throw new Error('Échec du téléchargement de la photo')
        }
        const uploadData = await uploadResponse.json()
        photoUrl = uploadData.url
      }

      const response = await fetch(`/api/admin/arbitres/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: editForm.nom,
          nom_en: editForm.nom_en || null,
          nom_ar: editForm.nom_ar || null,
          date_naissance: editForm.date_naissance || null,
          photo_url: photoUrl,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Mise à jour impossible')
      }
      setEditingId(null)
      setEditForm({ ...emptyForm })
      await loadArbitres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setUploadingEdit(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!editingId) return
    setError(null)
    try {
      const response = await fetch(`/api/admin/arbitres/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: editForm.nom,
          nom_en: editForm.nom_en || null,
          nom_ar: editForm.nom_ar || null,
          date_naissance: editForm.date_naissance || null,
          photo_url: '',
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Suppression impossible')
      }
      setEditForm((prev) => ({ ...prev, photo_url: '', photoFile: null }))
      await loadArbitres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet arbitre ?')) return
    setError(null)
    try {
      const response = await fetch(`/api/admin/arbitres/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Suppression impossible')
      }
      // Si on supprime l'arbitre en cours d'édition, annuler l'édition
      if (editingId === id) {
        setEditingId(null)
        setEditForm({ ...emptyForm })
      }
      await loadArbitres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  return {
    arbitres,
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
    viewingPhoto,
    setViewingPhoto,
    searchQuery,
    setSearchQuery,
    filteredAndSortedArbitres,
    handleFileChange,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDeletePhoto,
    handleDelete,
  }
}
