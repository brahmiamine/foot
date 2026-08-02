import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Arbitre } from '@/types'
import { emptyForm } from './constants'
import type { ArbitreFormState } from './types'

export function useAdminDashboard() {
  const router = useRouter()
  const [arbitres, setArbitres] = useState<Arbitre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<ArbitreFormState>(emptyForm)
  const [editForm, setEditForm] = useState<ArbitreFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
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
    const file = fileList?.[0] ?? null
    formSetter((prev) => ({ ...prev, photoFile: file }))
    }

  async function uploadPhoto(file: File | null, mode: 'create' | 'edit') {
    if (!file) return ''
    if (mode === 'create') {
      setUploadingCreate(true)
    } else {
      setUploadingEdit(true)
    }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/uploads/arbitre', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Échec de l’envoi de la photo')
      }
      const data = await response.json()
      return data.url as string
    } finally {
      if (mode === 'create') {
        setUploadingCreate(false)
      } else {
        setUploadingEdit(false)
      }
    }
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const photoUrl = await uploadPhoto(createForm.photoFile, 'create')
      const response = await fetch('/api/admin/arbitres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: createForm.nom,
          nom_en: createForm.nom_en || null,
          nom_ar: createForm.nom_ar || null,
          date_naissance: createForm.date_naissance || null,
          photo_url: photoUrl || createForm.photo_url || null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Création impossible')
      }

      setCreateForm({ ...emptyForm })
      await loadArbitres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  const startEdit = (arbitre: Arbitre) => {
    setEditingId(arbitre.id)
    setEditForm({
      nom: arbitre.nom,
      nom_en: arbitre.nom_en || '',
      nom_ar: arbitre.nom_ar || '',
      date_naissance: arbitre.date_naissance
        ? arbitre.date_naissance.slice(0, 10)
        : '',
      photoFile: null,
      photo_url: arbitre.photo_url || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...emptyForm })
  }

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingId) return
    setError(null)
    try {
      let photoUrl = editForm.photo_url || null

      // Si une nouvelle photo est sélectionnée, l'uploader
      if (editForm.photoFile) {
        photoUrl = await uploadPhoto(editForm.photoFile, 'edit')
      }
      // Si photo_url est vide (photo supprimée), envoyer null
      else if (editForm.photo_url === '') {
        photoUrl = null
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
    }
  }

  const handleImport = async (event: FormEvent) => {
    event.preventDefault()
    if (!importFile) {
      setImportMessage('Veuillez sélectionner un fichier CSV')
      return
    }
    setImportMessage(null)
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const response = await fetch('/api/admin/arbitres/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(payload.error || 'Import impossible')
      }
      const payload = await response.json()
      setImportMessage(`Import réussi: ${payload.inserted} ajoutés, ${payload.updated} mis à jour`)
      setImportFile(null)
      const formElement = event.currentTarget as HTMLFormElement
      formElement.reset()
      await loadArbitres()
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'Erreur pendant l’import')
    } finally {
      setImporting(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    router.refresh()
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
    importFile,
    setImportFile,
    importMessage,
    importing,
    uploadingCreate,
    uploadingEdit,
    viewingPhoto,
    setViewingPhoto,
    searchQuery,
    setSearchQuery,
    filteredAndSortedArbitres,
    handleFileChange,
    handleCreate,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleImport,
    handleLogout,
  }
}
