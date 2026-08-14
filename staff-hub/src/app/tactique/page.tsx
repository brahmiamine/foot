import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

export default async function TactiquePage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "tactics.view")) redirect("/");

  const boards = await staffPortalService.listTacticsBoards(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Planches tactiques</h1>
      <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>
        Aperçu des planches créées dans club-hub. L&apos;éditeur graphique reste dans club-hub.
      </p>

      {boards.length === 0 && <EmptyState title="Aucune planche" description="Aucune planche tactique enregistrée pour votre périmètre." />}

      {boards.map((board) => (
        <Card key={board.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{board.title}</div>
              {board.description && <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>{board.description}</div>}
              <div style={{ fontSize: "0.78rem", color: "var(--sh-text-subtle)", marginTop: 4 }}>{formatDate(board.createdAt)}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {board.category && <Badge label={board.category} tone="neutral" />}
              <Badge label={board.isPublic ? "Publique" : "Privée"} tone={board.isPublic ? "success" : "neutral"} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
