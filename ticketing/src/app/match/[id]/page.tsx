import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/tickets";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { formatMatchDateTime, formatPriceTnd } from "@/lib/format";
import { PurchaseForm } from "@/components/PurchaseForm";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { locale, t } = await getTranslator();
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) notFound();

  const session = await getSsoSession();
  const loginUrl = !session || session.role !== "MEMBER" ? await buildMemberLoginUrlForPath(`/match/${id}`) : null;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <Link href="/" style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {t("common.allMatches")}
      </Link>

      <div style={{ marginTop: 10, marginBottom: 4, fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {match.date ? formatMatchDateTime(match.date, locale) : t("common.dateTbc")}
        {match.stadium ? ` · ${localized(locale, match.stadium, match.stadiumAr)}` : ""}
      </div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0, marginBottom: "1.25rem" }}>
        {localized(locale, match.homeTeamName, match.homeTeamNameAr)} <span style={{ color: "var(--tk-text-subtle)", fontWeight: 500 }}>{t("common.vs")}</span> {localized(locale, match.awayTeamName, match.awayTeamNameAr)}
      </h1>

      {match.offers.length === 0 ? (
        <p style={{ color: "var(--tk-text-muted)" }}>{t("match.noOffers")}</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {match.offers.map((offer) => (
            <div
              key={offer.matchTicketCategoryId}
              style={{
                background: "var(--tk-surface)",
                border: "1px solid var(--tk-border)",
                borderRadius: "var(--tk-radius-md)",
                padding: "1rem 1.15rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>{offer.categoryName}</strong>
                <span>{formatPriceTnd(offer.price, locale)}</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 2 }}>
                {t("match.remaining", { count: offer.remaining })}
                {offer.allowedAudience !== "PUBLIC" && (
                  <> · {t(offer.allowedAudience === "HOME_SUPPORTERS" ? "match.homeOnly" : "match.awayOnly")}</>
                )}
              </div>

              {loginUrl ? (
                <a
                  href={loginUrl}
                  style={{ display: "inline-block", marginTop: 10, fontSize: "0.82rem", color: "var(--tk-primary)", fontWeight: 600 }}
                >
                  {t("match.login")}
                </a>
              ) : (
                <PurchaseForm
                  matchTicketCategoryId={offer.matchTicketCategoryId}
                  price={offer.price}
                  remaining={offer.remaining}
                  allowedAudience={offer.allowedAudience}
                  maxTicketsPerUser={offer.maxTicketsPerUser}
                  saleOpen={offer.saleOpen}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
