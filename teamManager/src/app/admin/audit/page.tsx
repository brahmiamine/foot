import { AuditLogService } from "@/services/AuditLogService";

export const dynamic = "force-dynamic";

/**
 * Page Journal d'audit — port de cardManager/app/[locale]/admin/dashboard/audit.
 * Lecture seule, réservé aux comptes du club (mêmes filtres que cardManager).
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; from?: string; to?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const auditLogService = new AuditLogService();
  const { logs, total, pages } = await auditLogService.findAll(
    { action: params.action, entity: params.entity, from: params.from, to: params.to },
    page,
    50
  );

  const buildLink = (nextPage: number) => {
    const qs = new URLSearchParams();
    if (params.action) qs.set("action", params.action);
    if (params.entity) qs.set("entity", params.entity);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    qs.set("page", String(nextPage));
    return `/admin/audit?${qs.toString()}`;
  };

  const smallInputClass = "form-control form-control-sm";

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Journal d&apos;audit</h1>

      <div className="card mb-4">
        <div className="card-body">
          <form method="get" className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small mb-1">Action</label>
            <select name="action" className={smallInputClass} defaultValue={params.action ?? ""}>
              <option value="">Toutes</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small mb-1">Entité</label>
            <input type="text" name="entity" className={smallInputClass} defaultValue={params.entity ?? ""} placeholder="Card, Fine..." />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small mb-1">Du</label>
            <input type="date" name="from" className={smallInputClass} defaultValue={params.from ?? ""} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small mb-1">Au</label>
            <input type="date" name="to" className={smallInputClass} defaultValue={params.to ?? ""} />
            </div>
            <div className="col-12 col-md-2 d-grid">
              <button type="submit" className="btn btn-primary btn-sm">
              Filtrer
            </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {logs.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">Aucune entrée</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Utilisateur</th>
                    <th>Action</th>
                    <th>Entité</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString("fr-TN")}</td>
                      <td>{log.user?.name ?? log.userId}</td>
                      <td>
                        <span
                          className={`badge ${
                            log.action === "CREATE"
                              ? "bg-success-subtle text-success"
                              : log.action === "DELETE"
                                ? "bg-danger-subtle text-danger"
                                : "bg-primary-subtle text-primary"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>{log.entity}</td>
                      <td className="text-muted small">{log.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {pages > 1 && (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Page {page} / {pages} ({total} entrées)
            </span>
            <div className="d-flex gap-2">
              <a
                className={`btn btn-sm btn-outline-secondary ${page <= 1 ? "disabled" : ""}`}
                href={buildLink(page - 1)}
              >
                Précédent
              </a>
              <a
                className={`btn btn-sm btn-outline-secondary ${page >= pages ? "disabled" : ""}`}
                href={buildLink(page + 1)}
              >
                Suivant
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
