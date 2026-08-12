import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/adminAuth";
import { buildAdminLoginUrlForPath } from "@/lib/ssoSession";
import { listAudienceMismatchTickets } from "@/lib/tickets";
import { formatMatchDateTime } from "@/lib/format";
import { AudienceMismatchTable } from "@/components/admin/AudienceMismatchTable";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

const AUDIENCE_KEYS = { HOME_SUPPORTERS: "admin.home", AWAY_SUPPORTERS: "admin.away", PUBLIC: "admin.public" } as const;

export const dynamic = "force-dynamic";

/**
 * Écran de modération pour Ticket.audienceMismatch (voir
 * src/lib/tickets.ts) : jusqu'ici ce signal était tracé en base sans
 * qu'aucun écran ne le consomme (voir avancement.md). Réservé aux rôles
 * ADMIN/SUPERADMIN (src/lib/adminAuth.ts) — jamais un blocage d'achat.
 */
export default async function AudienceMismatchPage() {
  const { locale, t } = await getTranslator();
  const authorized = await hasAdminSession();
  if (!authorized) {
    redirect(await buildAdminLoginUrlForPath("/admin/audience-mismatch"));
  }

  const tickets = await listAudienceMismatchTickets();
  const rows = tickets.map((ticket) => ({
    id: ticket.id,
    reference: ticket.reference,
    status: ticket.status,
    declaredAudienceLabel: ticket.declaredAudience in AUDIENCE_KEYS ? t(AUDIENCE_KEYS[ticket.declaredAudience as keyof typeof AUDIENCE_KEYS]) : ticket.declaredAudience,
    matchLabel: `${localized(locale, ticket.homeTeamName, ticket.homeTeamNameAr)} ${t("common.vs")} ${localized(locale, ticket.awayTeamName, ticket.awayTeamNameAr)}`,
    matchDateLabel: ticket.matchDate ? formatMatchDateTime(ticket.matchDate, locale) : t("common.dateTbc"),
    categoryName: ticket.categoryName,
    createdAtLabel: formatMatchDateTime(ticket.createdAt, locale),
  }));

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>{t("admin.title")}</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--tk-text-muted)", marginBottom: "1.5rem" }}>
        {t("admin.description")}
      </p>
      <AudienceMismatchTable initialTickets={rows} />
    </main>
  );
}
