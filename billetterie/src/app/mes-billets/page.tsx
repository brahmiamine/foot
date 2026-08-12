import Link from "next/link";
import { redirect } from "next/navigation";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { listMyTickets } from "@/lib/tickets";
import { formatMatchDateTime, formatPriceTnd } from "@/lib/format";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

const STATUS_KEYS = { PENDING: "status.pending", PAID: "status.paid", CANCELLED: "status.cancelled", USED: "status.used" } as const;

export default async function MesBilletsPage() {
  const { locale, t } = await getTranslator();
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
    redirect(await buildMemberLoginUrlForPath("/mes-billets"));
  }

  const tickets = await listMyTickets(session.id);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <Link href="/" style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {t("common.allMatches")}
      </Link>
      <h1 style={{ fontSize: "1.35rem", marginTop: 10, marginBottom: "1.25rem" }}>{t("tickets.title")}</h1>

      {tickets.length === 0 ? (
        <p style={{ color: "var(--tk-text-muted)" }}>{t("tickets.empty")}</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              style={{
                background: "var(--tk-surface)",
                border: "1px solid var(--tk-border)",
                borderRadius: "var(--tk-radius-md)",
                padding: "1rem 1.15rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>
                  {localized(locale, ticket.homeTeamName, ticket.homeTeamNameAr)} {t("common.vs")} {localized(locale, ticket.awayTeamName, ticket.awayTeamNameAr)}
                </strong>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: ticket.status === "PAID" ? "var(--tk-success)" : "var(--tk-text-muted)",
                  }}
                >
                  {ticket.status in STATUS_KEYS ? t(STATUS_KEYS[ticket.status as keyof typeof STATUS_KEYS]) : ticket.status}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 4 }}>
                {ticket.matchDate ? formatMatchDateTime(ticket.matchDate, locale) : t("common.dateTbc")}
              </div>
              <div style={{ fontSize: "0.82rem", marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span>
                  {ticket.categoryName} · {t("common.reference")} <code>{ticket.reference}</code>
                </span>
                <span>{formatPriceTnd(ticket.price, locale)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
