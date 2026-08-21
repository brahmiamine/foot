import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { RequestForm } from "./RequestForm";

/** PLAYER-005 (P2) — demandes administratives joueur (attestations/documents/rendez-vous) avec suivi. */
export default async function DemandesPage() {
  const session = await auth();
  if (!session) return null;

  const requests = await playerPortalService.listMyAdministrativeRequests(session.user.playerId);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mes demandes</h1>
      <RequestForm
        requests={requests.map((r) => ({
          id: r.id,
          requestType: r.requestType,
          details: r.details,
          status: r.status,
          staffNote: r.staffNote ?? null,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
