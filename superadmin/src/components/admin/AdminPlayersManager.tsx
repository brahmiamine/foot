'use client'

import React, { useEffect, useMemo, useState } from 'react'

interface PlayerSummary {
  id: string
  firstNameFr: string
  firstNameAr: string | null
  lastNameFr: string
  lastNameAr: string | null
  number: number
  category: string
  position: string | null
  imageUrl: string | null
  isActive: boolean
  teamId: string
}

interface ClubPlayers {
  team: { id: string; nom: string; nom_ar?: string | null; logo_url?: string | null }
  players: PlayerSummary[]
}

interface TransferHistoryEntry {
  id: string
  playerId: string
  playerNameFr: string
  playerNumber: number | null
  fromTeamId: string
  fromTeamName: string
  toTeamId: string
  toTeamName: string
  note: string | null
  performedBy: string | null
  transferredAt: string
}

/**
 * Effectif de tous les clubs, groupé par club, avec une action de
 * transfert par joueur (voir lib/adminPlayerTransfers.ts) et l'historique
 * des transferts déjà effectués.
 */
export default function AdminPlayersManager() {
  const [clubs, setClubs] = useState<ClubPlayers[]>([])
  const [history, setHistory] = useState<TransferHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [transferringPlayerId, setTransferringPlayerId] = useState<string | null>(null)
  const [destinationTeamId, setDestinationTeamId] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadPlayers = async () => {
    const response = await fetch('/api/admin/players', { cache: 'no-store', credentials: 'include' })
    if (!response.ok) throw new Error('Impossible de charger les joueurs')
    setClubs(await response.json())
  }

  const loadHistory = async () => {
    const response = await fetch('/api/admin/players/transfers', { cache: 'no-store', credentials: 'include' })
    if (!response.ok) throw new Error("Impossible de charger l'historique des transferts")
    setHistory(await response.json())
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadPlayers(), loadHistory()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const allTeams = useMemo(() => clubs.map((c) => c.team).sort((a, b) => a.nom.localeCompare(b.nom)), [clubs])

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clubs
    return clubs
      .map((club) => ({
        team: club.team,
        players: club.players.filter(
          (p) =>
            `${p.firstNameFr} ${p.lastNameFr}`.toLowerCase().includes(q) ||
            club.team.nom.toLowerCase().includes(q) ||
            String(p.number).includes(q),
        ),
      }))
      .filter((club) => club.players.length > 0)
  }, [clubs, search])

  const openTransferForm = (playerId: string) => {
    setTransferringPlayerId(playerId)
    setDestinationTeamId('')
    setNote('')
    setError(null)
    setSuccess(null)
  }

  const closeTransferForm = () => {
    setTransferringPlayerId(null)
    setDestinationTeamId('')
    setNote('')
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferringPlayerId || !destinationTeamId) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/players/${transferringPlayerId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toTeamId: destinationTeamId, note: note || null }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error ?? 'Erreur lors du transfert')
      }
      setSuccess(`${data.playerNameFr} a été transféré avec succès.`)
      closeTransferForm()
      await Promise.all([loadPlayers(), loadHistory()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du transfert')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <header className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <p className="text-muted text-uppercase small mb-1">Effectifs</p>
          <h1 className="mb-1">Joueurs par club</h1>
          <p className="text-muted mb-0">Consultez l&apos;effectif de chaque club et transférez un joueur vers un autre club.</p>
        </div>
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Rechercher un joueur ou un club..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {success && <div className="alert alert-success mb-0">{success}</div>}

      {loading ? (
        <p className="text-muted mb-0">Chargement...</p>
      ) : filteredClubs.length === 0 ? (
        <p className="text-muted mb-0">Aucun joueur trouvé.</p>
      ) : (
        <div className="d-flex flex-column gap-4">
          {filteredClubs.map((club) => (
            <section key={club.team.id} className="card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  {club.team.logo_url && (
                    <img src={club.team.logo_url} alt={club.team.nom} className="avatar-xs rounded" style={{ objectFit: 'contain' }} />
                  )}
                  <h5 className="mb-0">{club.team.nom}</h5>
                  <span className="badge bg-light text-muted">{club.players.length} joueur(s)</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Nom</th>
                        <th>Catégorie</th>
                        <th>Poste</th>
                        <th>Statut</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {club.players.map((player) => (
                        <React.Fragment key={player.id}>
                          <tr>
                            <td>{player.number}</td>
                            <td>
                              {player.firstNameFr} {player.lastNameFr}
                            </td>
                            <td>{player.category}</td>
                            <td>{player.position ?? '—'}</td>
                            <td>
                              {player.isActive ? (
                                <span className="badge bg-success-subtle text-success">Actif</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">Inactif</span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openTransferForm(player.id)}
                                disabled={submitting}
                              >
                                <i className="bx bx-transfer me-1" aria-hidden="true" />
                                Transférer
                              </button>
                            </td>
                          </tr>
                          {transferringPlayerId === player.id && (
                            <tr>
                              <td colSpan={6} className="bg-light">
                                <form onSubmit={handleTransfer} className="d-flex flex-wrap align-items-end gap-2 py-2">
                                  <div>
                                    <label className="form-label small mb-1">Club de destination</label>
                                    <select
                                      className="form-select form-select-sm"
                                      style={{ minWidth: 220 }}
                                      value={destinationTeamId}
                                      onChange={(e) => setDestinationTeamId(e.target.value)}
                                      required
                                    >
                                      <option value="">Sélectionner...</option>
                                      {allTeams
                                        .filter((t) => t.id !== player.teamId)
                                        .map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.nom}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <div className="flex-fill" style={{ minWidth: 220 }}>
                                    <label className="form-label small mb-1">Motif (optionnel)</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={note}
                                      onChange={(e) => setNote(e.target.value)}
                                      placeholder="Ex: transfert définitif, prêt..."
                                    />
                                  </div>
                                  <button type="submit" className="btn btn-sm btn-primary" disabled={submitting || !destinationTeamId}>
                                    {submitting ? 'Transfert...' : 'Confirmer'}
                                  </button>
                                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeTransferForm} disabled={submitting}>
                                    Annuler
                                  </button>
                                </form>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="card shadow-sm border-0">
        <div className="card-body">
          <h5 className="mb-3">Historique des transferts</h5>
          {history.length === 0 ? (
            <p className="text-muted mb-0">Aucun transfert enregistré.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Joueur</th>
                    <th>De</th>
                    <th>Vers</th>
                    <th>Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.id}>
                      <td className="text-muted small">{new Date(entry.transferredAt).toLocaleDateString('fr-FR')}</td>
                      <td>
                        {entry.playerNameFr}
                        {entry.playerNumber != null && <span className="text-muted"> (n°{entry.playerNumber})</span>}
                      </td>
                      <td>{entry.fromTeamName}</td>
                      <td>{entry.toTeamName}</td>
                      <td className="text-muted small">{entry.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
