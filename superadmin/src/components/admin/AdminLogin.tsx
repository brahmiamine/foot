'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin({ redirectTo }: { redirectTo?: string } = {}) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(payload.error || 'Identifiants incorrects')
      }

      if (redirectTo) {
        router.push(redirectTo)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de se connecter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card border-0 shadow auth-card">
      <div className="card-body p-4 p-sm-5">
        <div className="text-center mb-4">
          <h5 className="mb-1">Accès admin</h5>
          <p className="text-muted mb-0">Entrez les identifiants fournis pour gérer la plateforme.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="admin-username">Utilisateur</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bx bx-user" /></span>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="form-control"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="admin-password">Mot de passe</label>
            <div className="input-group auth-pass-inputgroup">
              <span className="input-group-text"><i className="bx bx-lock-alt" /></span>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="form-control"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <div className="mt-4 d-grid">
            <button type="submit" disabled={loading} className="btn btn-primary waves-effect waves-light">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


