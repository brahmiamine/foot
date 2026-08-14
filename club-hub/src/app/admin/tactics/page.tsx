import { redirect } from "next/navigation";
import Link from "next/link";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { TacticsBoardService } from "@/services/TacticsBoardService";
import { AGE_CATEGORY_LABELS } from "@/types/categories";
import { DeleteTacticsBoardButton } from "./DeleteTacticsBoardButton";

export const dynamic = "force-dynamic";

/**
 * Page Planches tactiques — liste des planches du coach connecté (privées)
 * et des planches publiques partagées par les autres coachs du club.
 */
export default async function TacticsBoardsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "tactics.view") && !can(access, "tactics.manage")) {
    redirect("/admin");
  }

  const service = new TacticsBoardService();
  const boards = await service.findVisible(teamId, access.userId);

  const myBoards = boards.filter((b) => b.ownerId === access.userId);
  const otherPublicBoards = boards.filter((b) => b.ownerId !== access.userId);
  const canManage = can(access, "tactics.manage");

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Planches tactiques</h1>
          <p className="text-muted mb-0">Préparez vos exercices d&apos;entraînement, privés ou partagés avec les autres coachs du club.</p>
        </div>
        {canManage && (
          <Link href="/admin/tactics/new" className="btn btn-primary">
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Nouvelle planche
          </Link>
        )}
      </div>

      <h6 className="text-uppercase text-muted small mb-2">Mes planches</h6>
      {myBoards.length === 0 ? (
        <p className="text-muted mb-4">Aucune planche pour le moment.</p>
      ) : (
        <div className="row g-3 mb-4">
          {myBoards.map((b) => (
            <div className="col-md-4 col-lg-3" key={b.id}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <h6 className="card-title mb-1">{b.title}</h6>
                  <div className="mb-2 d-flex gap-1 flex-wrap">
                    {b.category && <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[b.category]}</span>}
                    <span className={`badge ${b.isPublic ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>{b.isPublic ? "Publique" : "Privée"}</span>
                  </div>
                  {b.description && <p className="text-muted small mb-2">{b.description}</p>}
                  <div className="mt-auto d-flex gap-2">
                    <Link href={`/admin/tactics/${b.id}`} className="btn btn-sm btn-outline-primary flex-fill">
                      Ouvrir
                    </Link>
                    <DeleteTacticsBoardButton id={b.id} title={b.title} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h6 className="text-uppercase text-muted small mb-2">Planches publiques du club</h6>
      {otherPublicBoards.length === 0 ? (
        <p className="text-muted mb-0">Aucune planche publique partagée par un autre coach pour le moment.</p>
      ) : (
        <div className="row g-3">
          {otherPublicBoards.map((b) => (
            <div className="col-md-4 col-lg-3" key={b.id}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <h6 className="card-title mb-1">{b.title}</h6>
                  <div className="mb-2 d-flex gap-1 flex-wrap">
                    {b.category && <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[b.category]}</span>}
                    <span className="text-muted small">par {b.owner?.name ?? "Coach"}</span>
                  </div>
                  {b.description && <p className="text-muted small mb-2">{b.description}</p>}
                  <Link href={`/admin/tactics/${b.id}`} className="btn btn-sm btn-outline-secondary mt-auto">
                    Consulter
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
