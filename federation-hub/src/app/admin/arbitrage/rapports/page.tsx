import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
import { listSubmittedRefereeReports } from '@/lib/refereeMatchReports'

const ROLE_LABELS: Record<string, string> = {
  CENTER_REFEREE: 'Arbitre central',
  ASSISTANT_REFEREE: 'Arbitre assistant',
  FOURTH_OFFICIAL: 'Quatrième arbitre',
  MATCH_DELEGATE: 'Commissaire de match',
  REFEREE_OBSERVER: "Observateur d'arbitres",
}

const TYPE_LABELS: Record<string, string> = {
  REFEREE_COMPLEMENTARY: 'Rapport complémentaire',
  MATCH_DELEGATE: 'Rapport commissaire',
  REFEREE_OBSERVER: "Rapport d'observation",
}

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'Général',
  SECURITY: 'Sécurité',
  ORGANIZATION: 'Organisation',
  DISCIPLINE: 'Discipline',
  TECHNICAL: 'Technique',
  OTHER: 'Autre',
}

function formatDate(value?: Date | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(value)
}

export default async function RefereeReportsPage() {
  const session = await getCompetitionAdminPageSession()
  if (!session) return <AdminLogin />
  const reports = await listSubmittedRefereeReports(session)

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
        <div>
          <span className="text-uppercase text-danger fw-semibold small">Officiels de match · privé</span>
          <h1 className="h3 mb-1 mt-1">Rapports des officiels</h1>
          <p className="text-muted mb-0">Rapports définitifs des arbitres, commissaires de match et observateurs dans votre périmètre.</p>
        </div>
        <span className="badge bg-primary-subtle text-primary fs-6">{reports.length} rapport{reports.length > 1 ? 's' : ''}</span>
      </div>

      <div className="d-grid gap-3">
        {reports.map((report) => {
          const match = report.match!
          return (
            <article key={report.id} className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                  <div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <span className="badge bg-success-subtle text-success">Envoyé</span>
                      <span className="badge bg-primary-subtle text-primary">{TYPE_LABELS[report.reportType] ?? report.reportType}</span>
                      <span className="badge bg-secondary-subtle text-secondary">{CATEGORY_LABELS[report.category] ?? report.category}</span>
                    </div>
                    <h2 className="h5 mb-1">{report.subject}</h2>
                    <p className="text-muted small mb-0">
                      {match.equipe_home?.nom ?? 'Équipe domicile'} — {match.equipe_away?.nom ?? 'Équipe extérieure'} · {formatDate(match.date)}
                    </p>
                  </div>
                  <div className="text-md-end small">
                    <strong className="d-block">{report.author?.name ?? report.userId}</strong>
                    <span className="text-muted">{ROLE_LABELS[report.role] ?? report.role}</span>
                    <span className="d-block text-muted mt-1">Envoyé le {formatDate(report.submittedAt)}</span>
                  </div>
                </div>
                <div className="border-top pt-3" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{report.content}</div>
              </div>
            </article>
          )
        })}
      </div>

      {reports.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5 text-center text-muted">
            <i className="bx bx-file fs-1 d-block mb-2" />
            Aucun rapport d'officiel envoyé dans votre périmètre.
          </div>
        </div>
      )}
    </div>
  )
}
