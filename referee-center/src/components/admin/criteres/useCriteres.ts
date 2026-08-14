import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { CritereDefinition } from '@/types'
import { defaultForm } from './constants'
import type { FormState } from './types'

export function useCriteres() {
  const [criteres, setCriteres] = useState<CritereDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<FormState>(defaultForm)
  const [editForm, setEditForm] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sortedCriteres = useMemo(() => {
    return [...criteres].sort((a, b) => {
      if (a.categorie === b.categorie) {
        return a.id.localeCompare(b.id)
      }
      return a.categorie.localeCompare(b.categorie)
    })
  }, [criteres])

  useEffect(() => {
    loadCriteres()
  }, [])

  async function loadCriteres() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/criteres', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Impossible de charger les critères')
      }
      const data = (await response.json()) as CritereDefinition[]
      setCriteres(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function resetCreateForm() {
    setCreateForm(defaultForm)
    setShowCreateForm(false)
  }

  function resetEditForm() {
    setEditForm(defaultForm)
    setEditingId(null)
  }

  function startEdit(critere: CritereDefinition) {
    setEditingId(critere.id)
    setEditForm({
      id: critere.id,
      categorie: critere.categorie,
      label_fr: critere.label_fr,
      label_en: critere.label_en ?? '',
      label_ar: critere.label_ar,
      description_fr: critere.description_fr ?? '',
      description_ar: critere.description_ar ?? '',
    })
    setShowCreateForm(false)
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        id: createForm.id.trim(),
        categorie: createForm.categorie,
        label_fr: createForm.label_fr.trim(),
        label_en: createForm.label_en.trim() || null,
        label_ar: createForm.label_ar.trim(),
        description_fr: createForm.description_fr.trim() || null,
        description_ar: createForm.description_ar.trim() || null,
      }

      const response = await fetch('/api/admin/criteres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Impossible de créer le critère')
      }

      resetCreateForm()
      await loadCriteres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault()
    if (!editingId) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        id: editForm.id.trim(),
        categorie: editForm.categorie,
        label_fr: editForm.label_fr.trim(),
        label_en: editForm.label_en.trim() || null,
        label_ar: editForm.label_ar.trim(),
        description_fr: editForm.description_fr.trim() || null,
        description_ar: editForm.description_ar.trim() || null,
      }

      const response = await fetch(`/api/admin/criteres/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Impossible de mettre à jour le critère')
      }

      resetEditForm()
      await loadCriteres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce critère ?')) {
      return
    }
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/criteres/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? 'Suppression impossible')
      }
      if (editingId === id) {
        resetEditForm()
      }
      await loadCriteres()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return {
    criteres,
    loading,
    error,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingId,
    showCreateForm,
    setShowCreateForm,
    submitting,
    deletingId,
    sortedCriteres,
    loadCriteres,
    resetCreateForm,
    resetEditForm,
    startEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
