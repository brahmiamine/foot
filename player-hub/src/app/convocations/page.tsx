import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ConvocationResponseButtons } from "@/components/portal/ConvocationResponse";
import { formatDateTime } from "@/lib/format";

const RESPONSE_LABEL: Record<string, { label: string; tone: "success" | "danger" | "neutral" }> = {
  PRESENT: { label: "Présent", tone: "success" },
  ABSENT: { label: "Absent", tone: "danger" },
  PENDING: { label: "En attente", tone: "neutral" },
};

export default async function ConvocationsPage() {
  const session = await auth();
  if (!session) return null;

  const convocations = await playerPortalService.getConvocations(session.user.playerId);
  const matchesByConvocation = await playerPortalService.resolveConvocationMatches(convocations);
  const withMatch = convocations.map((convocation) => ({
    convocation,
    match: matchesByConvocation.get(convocation.id) ?? null,
  }));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mes convocations</h1>

      {withMatch.length === 0 && (
        <EmptyState title="Aucune convocation" description="Vous n'avez pas encore été convoqué." />
      )}

      {withMatch.map(({ convocation, match }) => (
        <Card key={convocation.id}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{match ? match.opponentName : "Match"}</div>
              <div style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem" }}>{formatDateTime(match?.date)}</div>
              {convocation.lineupRole && (
                <div style={{ marginTop: 6 }}>
                  <Badge label={convocation.lineupRole === "STARTER" ? "Titulaire" : "Remplaçant"} tone="info" />
                </div>
              )}
            </div>
            <Badge
              label={RESPONSE_LABEL[convocation.response]?.label ?? convocation.response}
              tone={RESPONSE_LABEL[convocation.response]?.tone ?? "neutral"}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <ConvocationResponseButtons
              convocationId={convocation.id}
              current={convocation.response}
              cancelled={Boolean(convocation.cancelledAt)}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
