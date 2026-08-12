import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/adminAuth";
import { buildAdminLoginUrlForPath } from "@/lib/ssoSession";
import { listAudienceMismatchTickets } from "@/lib/tickets";
import { formatMatchDateTime } from "@/lib/format";
import { AudienceMismatchTable } from "@/components/admin/AudienceMismatchTable";

const AUDIENCE_LABELS: Record<string, string> = {
  HOME_SUPPORTERS: "Domicile",
  AWAY_SUPPORTERS: "Visiteurs",
  PUBLIC: "Public",
};

export const dynamic = "force-dynamic";

/**
 * Écran de modération pour Ticket.audienceMismatch (voir
 * src/lib/tickets.ts) : jusqu'ici ce signal était tracé en base sans
 * qu'aucun écran ne le consomme (voir avancement.md). Réservé aux rôles
 * ADMIN/SUPERADMIN (src/lib/adminAuth.ts) — jamais un blocage d'achat.
 */
export default async function AudienceMismatchPage() {
  const authorized = await hasAdminSession();
  if (!authorized) {
    redirect(await buildAdminLoginUrlForPath("/admin/audience-mismatch"));
  }

  const tickets = await listAudienceMismatchTickets();
  const rows = tickets.map((t) => ({
    id: t.id,
    reference: t.reference,
    status: t.status,
    declaredAudienceLabel: AUDIENCE_LABELS[t.declaredAudience] ?? t.declaredAudience,
    matchLabel: `${t.homeTeamName} vs ${t.awayTeamName}`,
    matchDateLabel: t.matchDate ? formatMatchDateTime(t.matchDate) : "Date à confirmer",
    categoryName: t.categoryName,
    createdAtLabel: formatMatchDateTime(t.createdAt),
  }));

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>Signal d&rsquo;audience</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--tk-text-muted)", marginBottom: "1.5rem" }}>
        Billets dont l&rsquo;audience déclarée (tribune domicile/visiteurs) ne correspond pas aux
        affiliations sso de l&rsquo;acheteur au moment de l&rsquo;achat. Signal de modération non
        bloquant : l&rsquo;achat reste valide, à vous de décider d&rsquo;une suite (contact,
        surveillance à l&rsquo;entrée) puis de marquer le cas comme traité.
      </p>
      <AudienceMismatchTable initialTickets={rows} />
    </main>
  );
}
