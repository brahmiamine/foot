'use client'

import { FormEvent, useState } from 'react'

export default function AcceptInvitationForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Impossible de créer le compte')
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le compte')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL || ''
    return (
      <div className="alert alert-success mb-0">
        Compte créé avec succès.{' '}
        {ssoUrl ? (
          <a href={`${ssoUrl}/login`} className="alert-link">
            Se connecter
          </a>
        ) : (
          'Vous pouvez maintenant vous connecter.'
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
      <div>
        <label className="form-label">Mot de passe</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className="form-control"
        />
      </div>
      <div>
        <label className="form-label">Confirmer le mot de passe</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          className="form-control"
        />
      </div>
      {error && <div className="alert alert-danger mb-0">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Création...' : 'Créer mon compte'}
      </button>
    </form>
  )
}
