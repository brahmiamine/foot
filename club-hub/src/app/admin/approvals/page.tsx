import { redirect } from "next/navigation";
import { getUserAccess, can } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { NewsService } from "@/services/NewsService";
import { AnnouncementService } from "@/services/AnnouncementService";
import { ProductService } from "@/services/ProductService";
import { approveClubPublication, rejectClubPublication } from "./actions";
import type { ClubApprovalDomain } from "@/entities/ClubGovernance";

export const dynamic = "force-dynamic";

function canReview(domain: ClubApprovalDomain, access: Awaited<ReturnType<typeof getUserAccess>>): boolean {
  if (domain === "NEWS") return can(access, "news.publish");
  if (domain === "ANNOUNCEMENT") return can(access, "announcements.manage");
  return can(access, "shop.manage");
}

async function entityLabel(domain: ClubApprovalDomain, entityId: string, teamId: string): Promise<string> {
  if (domain === "NEWS") {
    const item = await new NewsService().findById(Number(entityId), teamId);
    return item?.title ?? `Actualité #${entityId}`;
  }
  if (domain === "ANNOUNCEMENT") {
    const item = await new AnnouncementService().findById(Number(entityId), teamId);
    return item?.title ?? `Communiqué #${entityId}`;
  }
  const item = await new ProductService().findById(Number(entityId), teamId);
  return item?.nameFr ?? `Produit #${entityId}`;
}

export default async function ClubApprovalsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (
    !can(access, "news.publish") &&
    !can(access, "announcements.manage") &&
    !can(access, "shop.manage")
  ) {
    redirect("/admin");
  }

  const requests = (await new ClubApprovalService().listPending(teamId)).filter((request) =>
    canReview(request.domain, access),
  );
  const rows = await Promise.all(
    requests.map(async (request) => ({
      request,
      label: await entityLabel(request.domain, request.entityId, teamId),
    })),
  );

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 mb-1">Approbations</h1>
          <p className="text-muted mb-0">Publications en attente de validation dans votre périmètre.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="card-body text-muted">Aucune publication en attente.</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Domaine</th>
                  <th>Contenu</th>
                  <th>Mode</th>
                  <th>Demandé le</th>
                  <th className="text-end">Décision</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ request, label }) => (
                  <tr key={request.id}>
                    <td>
                      <span className="badge bg-light text-dark">{request.domain}</span>
                    </td>
                    <td>
                      <strong>{label}</strong>
                      <div className="small text-muted">#{request.entityId}</div>
                    </td>
                    <td>{request.approvalMode === "DUAL_APPROVAL" ? "Double approbation" : "Approbation simple"}</td>
                    <td>{new Date(request.createdAt).toLocaleString("fr-FR")}</td>
                    <td>
                      <div className="d-flex gap-2 justify-content-end flex-wrap">
                        <form action={approveClubPublication.bind(null, request.id)}>
                          <button className="btn btn-success btn-sm" type="submit">Approuver</button>
                        </form>
                        <form action={rejectClubPublication.bind(null, request.id)} className="d-flex gap-2">
                          <input
                            className="form-control form-control-sm"
                            type="text"
                            name="reason"
                            minLength={3}
                            maxLength={500}
                            placeholder="Motif du rejet"
                            required
                          />
                          <button className="btn btn-outline-danger btn-sm" type="submit">Rejeter</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
