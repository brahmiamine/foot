import Link from 'next/link'
import AdminLogin from '@/components/admin/AdminLogin'
import { getCompetitionAdminPageSession } from '@/lib/adminAuth'
import { getFederationActionDashboard } from '@/lib/actionDashboard'
import { getDataSource } from '@/lib/db'

export const dynamic = 'force-dynamic'

function badgeClass(priority: string): string {
  if (priority === 'ESCALATED') return 'bg-danger'
  if (priority === 'OVERDUE') return 'bg-warning text-dark'
  if (priority === 'DUE_SOON') return 'bg-info text-dark'
  return 'bg-secondary'
}

export default async function AdminActionsPage() {
  const session = await getCompetitionAdminPageSession()
  if (!session) return <AdminLogin />

  const source = await getDataSource()
  const items = await getFederationActionDashboard(source, session)

  return (
    <div className="container-fluid py-3">
      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap justify-content-between gap-3">
          <div>
            <p className="text-uppercase small text-muted fw-semibold mb-1">GOV-009 · Action Center</p>
            <h1 className="h4 mb-1">Mes actions à traiter</h1>
            <p className="text-muted mb-0">
              Dossiers réellement visibles et décidables selon votre scope fédération/ligue et vos permissions réglementaires effectives.
            </p>
          </div>
          <span className="badge bg-primary fs-6 align-self-start">{items.length}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="alert alert-success">Aucune action à traiter dans votre périmètre.</div>
      ) : (
        <div className="row g-3">
          {items.map((item) => (
            <div className="col-12 col-xl-6" key={item.id}>
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-3 mb-2">
                    <h2 className="h6 mb-0">{item.title}</h2>
                    <span className={`badge ${badgeClass(item.priority)}`}>{item.priority}</span>
                  </div>
                  {item.description ? <p className="small text-muted">{item.description}</p> : null}
                  <dl className="row small mb-3">
                    <dt className="col-4">Depuis</dt>
                    <dd className="col-8">{new Date(item.requestedAt).toLocaleString('fr-FR')}</dd>
                    {item.dueAt ? <><dt className="col-4">Échéance</dt><dd className="col-8">{new Date(item.dueAt).toLocaleString('fr-FR')}</dd></> : null}
                  </dl>
                  <Link href={item.href} className="btn btn-sm btn-primary">
                    Ouvrir le workflow →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
