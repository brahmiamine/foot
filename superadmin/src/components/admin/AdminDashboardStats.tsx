'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardStats {
  arbitres: number
  matches: number
  votes: number
  unresolvedVoteAlerts: number
}

const ARBINOTE_URL = process.env.NEXT_PUBLIC_ARBINOTE_URL

export default function AdminDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des statistiques')
        }
        const data = await response.json()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '40vh' }}>
        <div className="text-center">
          <p className="text-muted mb-0">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '40vh' }}>
        <div className="text-center">
          <p className="text-danger mb-0">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="mb-1">
          Tableau de bord
        </h2>
        <p className="text-muted mb-0">
          Vue d&apos;ensemble de votre plateforme
        </p>
      </div>

      <div className="row g-4">
        <Link
          href="/admin/arbitres"
          className="col-xl-3 col-md-6 text-decoration-none"
        >
          <div className="card mini-stats-wid h-100 shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted fw-medium mb-2">Arbitres</p>
                  <h3 className="mb-0">{stats?.arbitres ?? 0}</h3>
                </div>
                <div className="avatar-sm rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center">
                  <i className="bx bx-user-check fs-4 text-primary" />
                </div>
              </div>
              <p className="text-primary fw-medium mb-0 mt-3">Voir tous les arbitres</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/matches"
          className="col-xl-3 col-md-6 text-decoration-none"
        >
          <div className="card mini-stats-wid h-100 shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted fw-medium mb-2">Matchs</p>
                  <h3 className="mb-0">{stats?.matches ?? 0}</h3>
                </div>
                <div className="avatar-sm rounded-circle bg-success-subtle d-flex align-items-center justify-content-center">
                  <i className="bx bx-football fs-4 text-success" />
                </div>
              </div>
              <p className="text-success fw-medium mb-0 mt-3">Voir tous les matchs</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/votes"
          className="col-xl-3 col-md-6 text-decoration-none"
        >
          <div className="card mini-stats-wid h-100 shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted fw-medium mb-2">Votes</p>
                  <h3 className="mb-0">{stats?.votes ?? 0}</h3>
                </div>
                <div className="avatar-sm rounded-circle bg-warning-subtle d-flex align-items-center justify-content-center">
                  <i className="bx bx-check-shield fs-4 text-warning" />
                </div>
              </div>
              <p className="text-warning fw-medium mb-0 mt-3">Voir tous les votes</p>
            </div>
          </div>
        </Link>

        <a
          href={ARBINOTE_URL ? `${ARBINOTE_URL}/admin/alerts` : '#'}
          className="col-xl-3 col-md-6 text-decoration-none"
        >
          <div className="card mini-stats-wid h-100 shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted fw-medium mb-2">Alertes de vote</p>
                  <h3 className={`mb-0 ${(stats?.unresolvedVoteAlerts ?? 0) > 0 ? 'text-danger' : ''}`}>
                    {stats?.unresolvedVoteAlerts ?? 0}
                  </h3>
                </div>
                <div className="avatar-sm rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center">
                  <i className="bx bx-bell fs-4 text-danger" />
                </div>
              </div>
              <p className="text-danger fw-medium mb-0 mt-3">
                {ARBINOTE_URL ? 'Voir dans ArbiNote' : 'NEXT_PUBLIC_ARBINOTE_URL non configuré'}
              </p>
            </div>
          </div>
        </a>
      </div>

      <div className="card shadow-sm border-0 mt-4">
        <div className="card-body">
          <h3 className="h5 mb-4">
          Accès rapide
          </h3>
          <div className="row g-3">
          {/* Anomalies/Alertes vivent dans arbinote, pas ici — ces deux liens
              pointaient vers des routes /admin/anomalies et /admin/alerts
              inexistantes dans superadmin (404) avant ce fix. */}
          <a
            href={ARBINOTE_URL ? `${ARBINOTE_URL}/admin/anomalies` : '#'}
              className="col-lg-3 col-md-6 text-decoration-none"
          >
              <div className="p-3 rounded border bg-light d-flex align-items-center gap-2 text-body">
                <i className="bx bx-error fs-4 text-warning" />
                <span className="fw-medium">Anomalies (ArbiNote)</span>
              </div>
          </a>
          <a
            href={ARBINOTE_URL ? `${ARBINOTE_URL}/admin/alerts` : '#'}
              className="col-lg-3 col-md-6 text-decoration-none"
          >
              <div className="p-3 rounded border bg-light d-flex align-items-center gap-2 text-body">
                <i className="bx bx-bell fs-4 text-danger" />
                <span className="fw-medium">Alertes (ArbiNote)</span>
              </div>
          </a>
          <Link
            href="/admin/federations"
              className="col-lg-3 col-md-6 text-decoration-none"
          >
              <div className="p-3 rounded border bg-light d-flex align-items-center gap-2 text-body">
                <i className="bx bx-buildings fs-4 text-primary" />
                <span className="fw-medium">Fédérations</span>
              </div>
          </Link>
          <Link
            href="/admin/leagues"
              className="col-lg-3 col-md-6 text-decoration-none"
          >
              <div className="p-3 rounded border bg-light d-flex align-items-center gap-2 text-body">
                <i className="bx bx-trophy fs-4 text-success" />
                <span className="fw-medium">Ligues</span>
              </div>
          </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

