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
    <div className="max-w-md mx-auto bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4 text-center">Accès admin</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Entrez les identifiants fournis pour gérer les arbitres.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur</label>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}


