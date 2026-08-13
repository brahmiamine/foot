'use client'

import { useEffect, useMemo, useState } from 'react'

type OfficialRole = 'PLATFORM_SUPERADMIN' | 'SUPERADMIN' | 'FEDERATION_ADMIN' | 'REFEREE_OBSERVER'

interface CurrentUser {
  id: string
  name: string
  role: OfficialRole
  federationId: string | null
}

interface CritereOption {
  id: string
  label: string
}

type EvaluationStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED'

interface Evaluation {
  id: string
  match_id: string
  arbitre_id: string
  observer_user_id: string
  criteres: Record<string, number>
  note_officielle: number | string
  points_forts?: string | null
  points_faibles?: string | null
  recommandations?: string | null
  status: EvaluationStatus
  submitted_at?: string | null
  validated_by?: string | null
  rejection_reason?: string | null
  created_at?: string
}

interface MatchOption {
  id: string
  date: string
  equipe_home?: { nom: string } | null
  equipe_away?: { nom: string } | null
}

interface ArbitreOption {
  id: string
  nom: string
}

const STATUS_LABELS: Record<EvaluationStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { label: 'Soumis', className: 'bg-amber-100 text-amber-700' },
  VALIDATED: { label: 'Validé', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
}

const CAN_WRITE_REPORTS = new Set<OfficialRole>(['REFEREE_OBSERVER', 'PLATFORM_SUPERADMIN', 'SUPERADMIN'])
const CAN_REVIEW = new Set<OfficialRole>(['FEDERATION_ADMIN', 'PLATFORM_SUPERADMIN', 'SUPERADMIN'])

function matchLabel(match?: MatchOption): string {
  if (!match) return '—'
  const home = match.equipe_home?.nom ?? '?'
  const away = match.equipe_away?.nom ?? '?'
  const date = match.date ? new Date(match.date).toLocaleDateString('fr-FR') : ''
  return `${home} vs ${away}${date ? ` — ${date}` : ''}`
}

/**
 * migration.md §12, Phase 5 : premier écran ArbiNote pour l'évaluation
 * fédérale officielle — jusqu'ici entièrement API-only. Trois blocs
 * indépendants selon le rôle de la session (`OFFICIAL_EVAL_ROLES`,
 * lib/adminAuth.ts) : rédaction (REFEREE_OBSERVER), homologation
 * (FEDERATION_ADMIN), historique/stats par arbitre (tout rôle officiel).
 * PLATFORM_SUPERADMIN voit les trois.
 */
export default function OfficielEvaluationsManager({
  currentUser,
  criteres,
}: {
  currentUser: CurrentUser
  criteres: CritereOption[]
}) {
  const canWrite = CAN_WRITE_REPORTS.has(currentUser.role)
  const canReview = CAN_REVIEW.has(currentUser.role)

  const [tab, setTab] = useState<'new' | 'mine' | 'review' | 'history'>(canWrite ? 'new' : 'review')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Évaluations officielles</h2>
        <p className="text-gray-500">
          Notation fédérale d&apos;un arbitre, distincte de la notation publique (migration.md §12).
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 flex-wrap">
        {canWrite && (
          <TabButton active={tab === 'new'} onClick={() => setTab('new')}>
            Nouveau rapport
          </TabButton>
        )}
        {canWrite && (
          <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
            Mes rapports
          </TabButton>
        )}
        {canReview && (
          <TabButton active={tab === 'review'} onClick={() => setTab('review')}>
            File d&apos;homologation
          </TabButton>
        )}
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          Historique par arbitre
        </TabButton>
      </div>

      {tab === 'new' && canWrite && <NewReportForm criteres={criteres} onCreated={() => setTab('mine')} />}
      {tab === 'mine' && canWrite && <MyReportsList criteres={criteres} />}
      {tab === 'review' && canReview && <ReviewQueue />}
      {tab === 'history' && <ArbitreHistory />}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? 'border-[#c42221] text-[#c42221]' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

function useMatchesAndArbitres() {
  const [matches, setMatches] = useState<MatchOption[]>([])
  const [arbitres, setArbitres] = useState<ArbitreOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/matches?limit=200').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/arbitres').then((r) => (r.ok ? r.json() : { items: [] })),
    ])
      .then(([matchesRes, arbitresRes]) => {
        setMatches(matchesRes.items ?? [])
        setArbitres(arbitresRes.items ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  return { matches, arbitres, loading }
}

function NewReportForm({ criteres, onCreated }: { criteres: CritereOption[]; onCreated: () => void }) {
  const { matches, arbitres, loading } = useMatchesAndArbitres()
  const [matchId, setMatchId] = useState('')
  const [arbitreId, setArbitreId] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [pointsForts, setPointsForts] = useState('')
  const [pointsFaibles, setPointsFaibles] = useState('')
  const [recommandations, setRecommandations] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const noteOfficielle = useMemo(() => {
    const values = Object.values(scores)
    if (values.length === 0) return null
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
  }, [scores])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (noteOfficielle === null) {
      setError('Notez au moins un critère')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/officiel/evaluations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          arbitre_id: arbitreId,
          criteres: scores,
          note_officielle: noteOfficielle,
          points_forts: pointsForts || null,
          points_faibles: pointsFaibles || null,
          recommandations: recommandations || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la création du rapport')
      setSuccess('Rapport créé en brouillon — à soumettre depuis "Mes rapports".')
      setMatchId('')
      setArbitreId('')
      setScores({})
      setPointsForts('')
      setPointsFaibles('')
      setRecommandations('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {error && <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>}
      {success && <div className="p-3 border border-green-200 bg-green-50 text-green-700 rounded">{success}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Match</label>
        <select
          required
          disabled={loading}
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">{loading ? 'Chargement...' : 'Sélectionner...'}</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {matchLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Arbitre évalué</label>
        <select
          required
          disabled={loading}
          value={arbitreId}
          onChange={(e) => setArbitreId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">{loading ? 'Chargement...' : 'Sélectionner...'}</option>
          {arbitres.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nom}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Critères techniques (1 à 5)</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {criteres.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm">{c.label}</span>
              <select
                required
                value={scores[c.id] ?? ''}
                onChange={(e) => setScores({ ...scores, [c.id]: Number(e.target.value) })}
                className="border border-gray-300 rounded px-2 py-1 w-16"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {noteOfficielle !== null && (
          <p className="text-sm text-gray-500 mt-2">Note officielle (moyenne) : {noteOfficielle}/5</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Points forts</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={2}
          value={pointsForts}
          onChange={(e) => setPointsForts(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Points faibles</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={2}
          value={pointsFaibles}
          onChange={(e) => setPointsFaibles(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Recommandations</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={2}
          value={recommandations}
          onChange={(e) => setRecommandations(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2 bg-[#c42221] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Créer le brouillon'}
      </button>
    </form>
  )
}

function useEvaluationLabels() {
  const { matches, arbitres } = useMatchesAndArbitres()
  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches])
  const arbitreById = useMemo(() => new Map(arbitres.map((a) => [a.id, a])), [arbitres])
  return { matchById, arbitreById }
}

function MyReportsList({ criteres }: { criteres: CritereOption[] }) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { matchById, arbitreById } = useEvaluationLabels()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/officiel/evaluations', { cache: 'no-store', credentials: 'include' })
      if (!response.ok) throw new Error('Chargement impossible')
      setEvaluations(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmitReport(evaluationId: string) {
    setSubmittingId(evaluationId)
    setError(null)
    try {
      const response = await fetch(`/api/officiel/evaluations/${evaluationId}/submit`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la soumission')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>

  return (
    <div className="space-y-3">
      {error && <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>}
      {evaluations.length === 0 ? (
        <p className="text-gray-500">Aucun rapport rédigé pour l&apos;instant.</p>
      ) : (
        evaluations.map((evaluation) => {
          const status = STATUS_LABELS[evaluation.status]
          if (editingId === evaluation.id) {
            return (
              <EditReportForm
                key={evaluation.id}
                evaluation={evaluation}
                criteres={criteres}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null)
                  load()
                }}
              />
            )
          }
          return (
            <div key={evaluation.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{matchLabel(matchById.get(evaluation.match_id))}</div>
                  <div className="text-sm text-gray-500">
                    Arbitre : {arbitreById.get(evaluation.arbitre_id)?.nom ?? evaluation.arbitre_id} · Note :{' '}
                    {evaluation.note_officielle}/5
                  </div>
                  {evaluation.status === 'REJECTED' && evaluation.rejection_reason && (
                    <div className="text-sm text-red-600 mt-1">Motif de rejet : {evaluation.rejection_reason}</div>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${status.className}`}>{status.label}</span>
              </div>
              {evaluation.status === 'DRAFT' && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(evaluation.id)}
                    className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    disabled={submittingId === evaluation.id}
                    onClick={() => handleSubmitReport(evaluation.id)}
                    className="px-4 py-1.5 bg-[#c42221] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {submittingId === evaluation.id ? 'Soumission...' : 'Soumettre à la fédération'}
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function EditReportForm({
  evaluation,
  criteres,
  onCancel,
  onSaved,
}: {
  evaluation: Evaluation
  criteres: CritereOption[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [scores, setScores] = useState<Record<string, number>>(evaluation.criteres ?? {})
  const [pointsForts, setPointsForts] = useState(evaluation.points_forts ?? '')
  const [pointsFaibles, setPointsFaibles] = useState(evaluation.points_faibles ?? '')
  const [recommandations, setRecommandations] = useState(evaluation.recommandations ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const noteOfficielle = useMemo(() => {
    const values = Object.values(scores)
    if (values.length === 0) return null
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
  }, [scores])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (noteOfficielle === null) {
      setError('Notez au moins un critère')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/officiel/evaluations/${evaluation.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteres: scores,
          note_officielle: noteOfficielle,
          points_forts: pointsForts || null,
          points_faibles: pointsFaibles || null,
          recommandations: recommandations || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la mise à jour')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#c42221]/40 rounded-lg p-4 space-y-3">
      {error && <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium mb-2">Critères techniques (1 à 5)</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {criteres.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm">{c.label}</span>
              <select
                required
                value={scores[c.id] ?? ''}
                onChange={(e) => setScores({ ...scores, [c.id]: Number(e.target.value) })}
                className="border border-gray-300 rounded px-2 py-1 w-16"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {noteOfficielle !== null && (
          <p className="text-sm text-gray-500 mt-2">Note officielle (moyenne) : {noteOfficielle}/5</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Points forts</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={2}
          value={pointsForts}
          onChange={(e) => setPointsForts(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Points faibles</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={2}
          value={pointsFaibles}
          onChange={(e) => setPointsFaibles(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Recommandations</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={2}
          value={recommandations}
          onChange={(e) => setRecommandations(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 bg-[#c42221] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}

function ReviewQueue() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { matchById, arbitreById } = useEvaluationLabels()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/officiel/evaluations', { cache: 'no-store', credentials: 'include' })
      if (!response.ok) throw new Error('Chargement impossible')
      setEvaluations(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleValidate(evaluationId: string) {
    setBusyId(evaluationId)
    setError(null)
    try {
      const response = await fetch(`/api/officiel/evaluations/${evaluationId}/validate`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors de la validation')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(evaluationId: string) {
    const reason = window.prompt('Motif du rejet :')
    if (!reason) return
    setBusyId(evaluationId)
    setError(null)
    try {
      const response = await fetch(`/api/officiel/evaluations/${evaluationId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Erreur lors du rejet')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>

  return (
    <div className="space-y-3">
      {error && <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>}
      {evaluations.length === 0 ? (
        <p className="text-gray-500">Aucun rapport en attente d&apos;homologation.</p>
      ) : (
        evaluations.map((evaluation) => (
          <div key={evaluation.id} className="border border-gray-200 rounded-lg p-4">
            <div className="font-medium">{matchLabel(matchById.get(evaluation.match_id))}</div>
            <div className="text-sm text-gray-500">
              Arbitre : {arbitreById.get(evaluation.arbitre_id)?.nom ?? evaluation.arbitre_id} · Note :{' '}
              {evaluation.note_officielle}/5
            </div>
            {evaluation.points_forts && <div className="text-sm mt-1">👍 {evaluation.points_forts}</div>}
            {evaluation.points_faibles && <div className="text-sm mt-1">👎 {evaluation.points_faibles}</div>}
            {evaluation.recommandations && <div className="text-sm mt-1">💡 {evaluation.recommandations}</div>}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={busyId === evaluation.id}
                onClick={() => handleValidate(evaluation.id)}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Valider
              </button>
              <button
                type="button"
                disabled={busyId === evaluation.id}
                onClick={() => handleReject(evaluation.id)}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Rejeter
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ArbitreHistory() {
  const { arbitres, loading: loadingArbitres } = useMatchesAndArbitres()
  const [arbitreId, setArbitreId] = useState('')
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [stats, setStats] = useState<{ evaluationCount: number; averageNoteOfficielle: number | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const { matchById } = useEvaluationLabels()

  async function loadHistory(id: string) {
    setLoading(true)
    try {
      const [evaluationsRes, statsRes] = await Promise.all([
        fetch(`/api/officiel/arbitres/${id}/evaluations`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/officiel/arbitres/${id}/stats`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
      ])
      setEvaluations(evaluationsRes)
      setStats(statsRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (arbitreId) loadHistory(arbitreId)
  }, [arbitreId])

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <label className="block text-sm font-medium mb-1">Arbitre</label>
        <select
          disabled={loadingArbitres}
          value={arbitreId}
          onChange={(e) => setArbitreId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Sélectionner...</option>
          {arbitres.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nom}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500">Chargement...</p>}

      {!loading && arbitreId && stats && (
        <div className="border border-gray-200 rounded-lg p-4 max-w-md">
          <p className="text-sm text-gray-500">
            {stats.evaluationCount} évaluation(s) validée(s) · Moyenne officielle :{' '}
            {stats.averageNoteOfficielle ?? '—'}/5
          </p>
        </div>
      )}

      {!loading && arbitreId && (
        <div className="space-y-3">
          {evaluations.length === 0 ? (
            <p className="text-gray-500">Aucune évaluation pour cet arbitre.</p>
          ) : (
            evaluations.map((evaluation) => {
              const status = STATUS_LABELS[evaluation.status]
              return (
                <div key={evaluation.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{matchLabel(matchById.get(evaluation.match_id))}</div>
                      <div className="text-sm text-gray-500">Note : {evaluation.note_officielle}/5</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${status.className}`}>{status.label}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
