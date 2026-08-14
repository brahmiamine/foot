'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'

interface ClubUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'OBSERVATEUR' | 'SUPERADMIN'
  isActive: boolean
  createdAt: string
}

interface ClubInfo {
  id: string
  nom: string
  logo_url?: string | null
}

export default function AdminClubUsersManager({ teamId }: { teamId: string }) {
  const { t } = useTranslations()
  const roleLabels: Record<string, string> = { ADMIN: t('admin.clubUsers.roles.admin'), OBSERVATEUR: t('admin.clubUsers.roles.observer'), SUPERADMIN: t('admin.clubUsers.roles.federation-hub') }
  const [club, setClub] = useState<ClubInfo | null>(null)
  const [users, setUsers] = useState<ClubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'ADMIN' as 'ADMIN' | 'OBSERVATEUR' })
  const [inviteSent, setInviteSent] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  async function load() {
    try {
      const response = await fetch(`/api/admin/club/${teamId}`, { cache: 'no-store', credentials: 'include' })
      if (!response.ok) throw new Error(t('admin.clubUsers.errors.load'))
      const data = await response.json()
      setClub(data.club)
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.common.unknownError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setInviteSent(null)
    try {
      const response = await fetch(`/api/admin/club/${teamId}/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? t('admin.common.error'))
      setInviteSent(form.email)
      setForm({ name: '', email: '', role: 'ADMIN' })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.common.unknownError'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(user: ClubUser) {
    try {
      const response = await fetch(`/api/admin/club/users/${user.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (!response.ok) throw new Error()
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)))
    } catch {
      setError(t('admin.clubUsers.errors.update'))
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    try {
      const response = await fetch(`/api/admin/club/users/${deleteId}`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok) throw new Error()
      setUsers((prev) => prev.filter((u) => u.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError(t('admin.clubUsers.errors.delete'))
    }
  }

  async function submitReset() {
    if (!resetId || resetPassword.length < 8) return
    try {
      const response = await fetch(`/api/admin/club/users/${resetId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })
      if (!response.ok) throw new Error()
      setResetId(null)
      setResetPassword('')
    } catch {
      setError(t('admin.clubUsers.errors.reset'))
    }
  }

  if (loading) return <p className="text-muted">{t('admin.common.loading')}</p>

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex align-items-center gap-3">
        <Link href="/admin/club" className="text-muted text-decoration-none">
          <i className="bx bx-left-arrow-alt me-1" aria-hidden="true" />
          Retour
        </Link>
      </div>

      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">{club?.nom ?? t('admin.clubUsers.club')}</h2>
          <p className="text-muted mb-0">{t('admin.clubUsers.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn btn-primary"
        >
          {showForm ? t('admin.common.cancel') : t('admin.clubUsers.invite')}
        </button>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {inviteSent && (
        <div className="alert alert-success mb-0">
          {t('admin.clubUsers.invitationSent', { email: inviteSent })}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleInvite} className="card shadow-sm border-0">
          <div className="card-body">
            <p className="text-muted small mb-3">
              {t('admin.clubUsers.invitationHelp')}
            </p>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">{t('admin.clubUsers.fullName')}</label>
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="form-control"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">{t('admin.clubUsers.email')}</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="form-control"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">{t('admin.clubUsers.role')}</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'OBSERVATEUR' }))}
                  className="form-select"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="OBSERVATEUR">Observateur</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-footer bg-transparent border-0 pt-0">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? t('admin.clubUsers.sending') : t('admin.clubUsers.sendInvitation')}
            </button>
          </div>
        </form>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {users.length === 0 ? (
            <p className="text-center text-muted py-4 mb-0">{t('admin.clubUsers.empty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('admin.clubUsers.name')}</th>
                    <th>{t('admin.clubUsers.email')}</th>
                    <th>{t('admin.clubUsers.role')}</th>
                    <th>{t('admin.clubUsers.status')}</th>
                    <th className="text-end">{t('admin.common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.6 }}>
                      <td className="fw-medium">{user.name}</td>
                      <td className="text-muted">{user.email}</td>
                      <td>
                        <span className="badge rounded-pill bg-secondary-subtle text-secondary">{roleLabels[user.role] ?? user.role}</span>
                      </td>
                      <td>
                        <span
                          className={`badge rounded-pill ${
                            user.isActive ? 'bg-success-subtle text-success' : 'bg-dark-subtle text-dark'
                          }`}
                        >
                          {user.isActive ? t('admin.clubUsers.active') : t('admin.clubUsers.inactive')}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button type="button" onClick={() => { setResetId(user.id); setResetPassword('') }} className="btn btn-sm btn-light" title={t('admin.clubUsers.resetPassword')}>
                            <i className="bx bx-key" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => toggleActive(user)} className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`} title={t('admin.clubUsers.toggleActive')}>
                            <i className={`bx ${user.isActive ? 'bx-pause' : 'bx-play'}`} aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => setDeleteId(user.id)} className="btn btn-sm btn-danger" title={t('admin.common.delete')}>
                            <i className="bx bx-trash" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {resetId && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 px-3" style={{ zIndex: 1050 }}>
          <div className="card shadow border-0" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="card-body">
              <h3 className="h6 mb-3">{t('admin.clubUsers.newPassword')}</h3>
              <input
                type="password"
                autoFocus
                minLength={8}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder={t('admin.clubUsers.passwordPlaceholder')}
                className="form-control"
              />
              <div className="d-flex justify-content-end gap-2 pt-3">
                <button type="button" onClick={() => setResetId(null)} className="btn btn-light btn-sm">
                  {t('admin.common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={submitReset}
                  disabled={resetPassword.length < 8}
                  className="btn btn-primary btn-sm"
                >
                  {t('admin.common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 px-3" style={{ zIndex: 1050 }}>
          <div className="card shadow border-0" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="card-body">
              <h3 className="h6 mb-2">{t('admin.clubUsers.deleteTitle')}</h3>
              <p className="small text-muted">{t('admin.common.irreversible')}</p>
              <div className="d-flex justify-content-end gap-2 pt-2">
                <button type="button" onClick={() => setDeleteId(null)} className="btn btn-light btn-sm">
                  {t('admin.common.cancel')}
                </button>
                <button type="button" onClick={confirmDelete} className="btn btn-danger btn-sm">
                  {t('admin.common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
