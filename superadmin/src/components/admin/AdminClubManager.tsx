'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClubRow {
  id: string
  nom: string
  nom_ar?: string | null
  logo_url?: string | null
  accountCount: number
}

export default function AdminClubManager() {
  const [clubs, setClubs] = useState<ClubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/admin/club', { cache: 'no-store', credentials: 'include' })
        if (!response.ok) {
          if (response.status === 401) throw new Error('Session admin expirée, reconnectez-vous')
          throw new Error(`Impossible de charger les clubs (HTTP ${response.status})`)
        }
        setClubs(await response.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = clubs.filter((club) => club.nom.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="mb-1">Gestion des comptes clubs</h2>
        <p className="text-muted mb-0">Créez et gérez les comptes de connexion (CardManager / TeamManager) de chaque club</p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-lg-4 col-md-6">
              <label className="form-label">Recherche</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un club..."
                className="form-control"
              />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {loading ? (
        <p className="text-muted">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">Aucun club trouvé</p>
      ) : (
        <div className="row g-3">
          {filtered.map((club) => (
            <Link
              key={club.id}
              href={`/admin/club/${club.id}`}
              className="col-12 col-md-6 col-xl-4 text-decoration-none"
            >
              <div className="card h-100 shadow-sm border-0 hover-shadow">
                <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-circle bg-light d-flex align-items-center justify-content-center overflow-hidden" style={{ width: '44px', height: '44px' }}>
                {club.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={club.logo_url} alt={club.nom} className="h-100 w-100 object-fit-contain" />
                ) : (
                  <span className="text-lg">🛡️</span>
                )}
              </div>
              <div className="flex-grow-1 min-w-0">
                <p className="fw-medium text-dark mb-1 text-truncate">{club.nom}</p>
                <p className="small text-muted mb-0">
                  {club.accountCount} compte{club.accountCount !== 1 ? 's' : ''}
                </p>
              </div>
              {club.accountCount === 0 && (
                <span className="badge bg-soft-warning text-warning-emphasis">
                  Sans compte
                </span>
              )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
