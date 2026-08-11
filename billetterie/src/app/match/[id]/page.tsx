import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/tickets";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { formatMatchDateTime, formatPriceTnd } from "@/lib/format";
import { PurchaseForm } from "@/components/PurchaseForm";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) notFound();

  const session = await getSsoSession();
  const loginUrl = !session || session.role !== "MEMBER" ? await buildMemberLoginUrlForPath(`/match/${id}`) : null;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <Link href="/" style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        &larr; Tous les matchs
      </Link>

      <div style={{ marginTop: 10, marginBottom: 4, fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {match.date ? formatMatchDateTime(match.date) : "Date à confirmer"}
        {match.stadium ? ` · ${match.stadium}` : ""}
      </div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0, marginBottom: "1.25rem" }}>
        {match.homeTeamName} <span style={{ color: "var(--tk-text-subtle)", fontWeight: 500 }}>vs</span> {match.awayTeamName}
      </h1>

      {match.offers.length === 0 ? (
        <p style={{ color: "var(--tk-text-muted)" }}>Aucune catégorie de billet n&rsquo;est ouverte pour ce match.</p>
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
                <span>{formatPriceTnd(offer.price)}</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 2 }}>
                {offer.remaining} place(s) restante(s)
                {offer.allowedAudience !== "PUBLIC" && (
                  <> · réservé aux supporters {offer.allowedAudience === "HOME_SUPPORTERS" ? "du club recevant" : "du club visiteur"}</>
                )}
              </div>

              {loginUrl ? (
                <a
                  href={loginUrl}
                  style={{ display: "inline-block", marginTop: 10, fontSize: "0.82rem", color: "var(--tk-primary)", fontWeight: 600 }}
                >
                  Se connecter pour acheter
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
