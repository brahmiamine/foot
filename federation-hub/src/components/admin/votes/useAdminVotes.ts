import { useEffect, useState, useCallback } from 'react'
import type { EditModalData, FilterOptions, Vote } from './types'

export function useAdminVotes() {
  const [votes, setVotes] = useState<Vote[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)

  // Filtres
  const [matchId, setMatchId] = useState('')
  const [arbitreId, setArbitreId] = useState('')
  const [journeeId, setJourneeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [voteStatus, setVoteStatus] = useState<'all' | 'voted' | 'not_voted'>('all')

  // Pagination
  const [limit] = useState(25)
  const [offset, setOffset] = useState(0)

  // Selection multiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Modal edition
  const [editModal, setEditModal] = useState<EditModalData | null>(null)
  const [saving, setSaving] = useState(false)

  // Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/arbitrage/arbinote/votes?getFilters=true')
      if (!res.ok) throw new Error('Erreur chargement filtres')
      const data = await res.json()
      setFilterOptions(data)
    } catch (err) {
      console.error('Error loading filter options:', err)
    }
  }, [])

  const loadVotes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (matchId) params.set('matchId', matchId)
      if (arbitreId) params.set('arbitreId', arbitreId)
      if (journeeId) params.set('journeeId', journeeId)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (voteStatus !== 'all') params.set('voteStatus', voteStatus)
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const res = await fetch(`/api/admin/arbitrage/arbinote/votes?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur chargement votes')

      const data = await res.json()
      setVotes(data.votes || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [matchId, arbitreId, journeeId, dateFrom, dateTo, voteStatus, limit, offset])

  const buildExportUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (matchId) params.set('matchId', matchId)
    if (arbitreId) params.set('arbitreId', arbitreId)
    if (journeeId) params.set('journeeId', journeeId)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (voteStatus !== 'all') params.set('voteStatus', voteStatus)
    return `/api/admin/arbitrage/arbinote/votes/export?${params.toString()}`
  }, [matchId, arbitreId, journeeId, dateFrom, dateTo, voteStatus])

  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  useEffect(() => {
    loadVotes()
  }, [loadVotes])

  useEffect(() => {
    setOffset(0)
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [matchId, arbitreId, journeeId, dateFrom, dateTo, voteStatus])

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
    setSelectAll(newSet.size === votes.length)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
      setSelectAll(false)
    } else {
      setSelectedIds(new Set(votes.map((v) => v.id)))
      setSelectAll(true)
    }
  }

  const openEditModal = (vote: Vote) => {
    setEditModal({
      vote,
      criteres: { ...vote.criteres },
    })
  }

  const saveEdit = async () => {
    if (!editModal) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/arbitrage/arbinote/votes/single/${editModal.vote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteres: editModal.criteres }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur modification')
      }

      setEditModal(null)
      loadVotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const deleteVote = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce vote ?')) return
    setDeletingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/admin/arbitrage/arbinote/votes/single/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur suppression')
      }

      loadVotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDeletingId(null)
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Supprimer ${selectedIds.size} vote(s) ?`)) return

    setBulkDeleting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/arbitrage/arbinote/votes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur suppression')
      }

      setSelectedIds(new Set())
      setSelectAll(false)
      loadVotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBulkDeleting(false)
    }
  }

  const resetFilters = () => {
    setMatchId('')
    setArbitreId('')
    setJourneeId('')
    setDateFrom('')
    setDateTo('')
    setVoteStatus('all')
  }

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return {
    votes,
    total,
    loading,
    error,
    filterOptions,
    matchId,
    setMatchId,
    arbitreId,
    setArbitreId,
    journeeId,
    setJourneeId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    voteStatus,
    setVoteStatus,
    limit,
    offset,
    setOffset,
    selectedIds,
    selectAll,
    editModal,
    setEditModal,
    saving,
    deletingId,
    bulkDeleting,
    loadVotes,
    buildExportUrl,
    toggleSelect,
    toggleSelectAll,
    openEditModal,
    saveEdit,
    deleteVote,
    bulkDelete,
    resetFilters,
    currentPage,
    totalPages,
  }
}
