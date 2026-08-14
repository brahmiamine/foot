import { FormEvent, useEffect, useMemo, useState } from 'react'
import { emptyForm } from './types'
import type { CardReason, CardReasonFormState } from './types'

function buildEdit(reason: CardReason): CardReasonFormState {
  return {
    labelFr: reason.labelFr || '',
    labelAr: reason.labelAr || '',
    type: reason.type,
    isActive: reason.isActive,
  }
}

export function useAdminCardReasons() {
  const [reasons, setReasons] = useState<CardReason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CardReasonFormState>(emptyForm)
  const [editForm, setEditForm] = useState<CardReasonFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('')

  useEffect(() => {
    loadReasons()
  }, [])

  async function loadReasons() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/card-reasons', { cache: 'no-store', credentials: 'include' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? `Impossible de charger les motifs (${response.status})`)
      }
      const data = (await response.json()) as CardReason[]
      setReasons(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const filteredReasons = useMemo(() => {
    let filtered = reasons
    if (filterType) {
      filtered = filtered.filter((r) => r.type === filterType)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (r) => r.labelFr.toLowerCase().includes(query) || r.labelAr?.toLowerCase().includes(query)
      )
    }
    return [...filtered].sort((a, b) => a.labelFr.localeCompare(b.labelFr, 'fr', { sensitivity: 'base' }))
  }, [reasons, filterType, searchQuery])

  function startEdit(reason: CardReason) {
    setEditingId(reason.id)
    setEditForm(buildEdit(reason))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/card-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          labelFr: createForm.labelFr,
          labelAr: createForm.labelAr || null,
          type: createForm.type,
          isActive: createForm.isActive,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Erreur lors de la création')
      }
      setCreateForm(emptyForm)
      setShowCreateForm(false)
      await loadReasons()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
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
      const response = await fetch(`/api/admin/card-reasons/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          labelFr: editForm.labelFr,
          labelAr: editForm.labelAr || null,
          type: editForm.type,
          isActive: editForm.isActive,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Erreur lors de la modification')
      }
      cancelEdit()
      await loadReasons()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce motif ? Il restera référencé sur les cartons déjà enregistrés.')) return
    setDeletingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/card-reasons/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Erreur lors de la suppression')
      }
      await loadReasons()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDeletingId(null)
    }
  }

  return {
    reasons: filteredReasons,
    loading,
    error,
    setError,
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
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
