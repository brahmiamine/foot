import Link from "next/link";
import { getUserAccess } from "@/lib/access";
import { ActionDashboardService } from "@/services/ActionDashboardService";

export const dynamic = "force-dynamic";

function priorityBadge(priority: string): string {
  if (priority === "ESCALATED") return "bg-danger";
  if (priority === "OVERDUE") return "bg-warning text-dark";
  if (priority === "DUE_SOON") return "bg-info text-dark";
  return "bg-secondary";
}

export default async function AdminActionsPage() {
  const access = await getUserAccess();
  const items = await new ActionDashboardService().listForUser(access.teamId, access);

  return (
    <div className="container-fluid px-0">
      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap align-items-start justify-content-between gap-3">
          <div>
            <h2 className="h5 mb-1">Mes actions à traiter</h2>
            <p className="text-muted mb-0">
              Uniquement les décisions en attente que vos permissions et les règles maker/checker vous autorisent réellement à traiter.
            </p>
          </div>
          <span className="badge bg-primary fs-6">{items.length}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="alert alert-success mb-0">Aucune action à traiter dans votre périmètre.</div>
      ) : (
        <div className="row g-3">
          {items.map((item) => (
            <div className="col-12 col-xl-6" key={item.id}>
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-3 mb-2">
                    <h3 className="h6 mb-0">{item.title}</h3>
                    <span className={`badge ${priorityBadge(item.priority)}`}>{item.priority}</span>
                  </div>
                  {item.description ? <p className="text-muted small">{item.description}</p> : null}
                  <p className="small mb-3">
                    Demandé le {new Date(item.requestedAt).toLocaleString("fr-FR")}
                  </p>
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
  );
}
