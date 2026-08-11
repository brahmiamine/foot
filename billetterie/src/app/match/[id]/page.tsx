import { notFound } from "next/navigation";
import { getMatchTicketingDetail } from "@/lib/tickets";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { TicketSaleAudience } from "@/entities/TicketSaleRule";
import PurchaseButton from "./PurchaseButton";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "Date à confirmer";
  return new Date(date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
}

function audienceLabel(audience: TicketSaleAudience): string | null {
  if (audience === TicketSaleAudience.HOME_SUPPORTERS) return "Réservé aux supporters de l'équipe recevante";
  if (audience === TicketSaleAudience.AWAY_SUPPORTERS) return "Réservé aux supporters de l'équipe visiteuse";
  return null;
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMatchTicketingDetail(id);
  if (!detail) notFound();

  const session = await getSsoSession();
  const isAuthenticated = session?.role === "MEMBER";
  const loginUrl = await buildMemberLoginUrlForPath(`/match/${id}`);

  return (
    <main className="tk-container">
      <div className="tk-card">
        <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginBottom: 6 }}>{formatDate(detail.date)}</div>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>
          {detail.homeTeam.nom} <span style={{ color: "var(--tk-text-muted)", fontWeight: 400 }}>vs</span> {detail.awayTeam.nom}
        </h1>
      </div>

      <h2 style={{ fontSize: "1rem" }}>Catégories</h2>
      {detail.categories.map((category) => {
        const restriction = category.saleRule ? audienceLabel(category.saleRule.allowedAudience) : null;
        const soldOut = category.available <= 0;
        return (
          <div key={category.matchTicketCategoryId} className="tk-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong>{category.name}</strong>
              <span>{Number(category.price).toFixed(3)} DT</span>
            </div>
            {category.description && (
              <p style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)", margin: "6px 0" }}>{category.description}</p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
              <span className="tk-badge">{soldOut ? "Complet" : `${category.available} place(s) restante(s)`}</span>
              {restriction && <span className="tk-badge">{restriction}</span>}
            </div>
            <PurchaseButton
              matchId={detail.matchId}
              matchTicketCategoryId={category.matchTicketCategoryId}
              isAuthenticated={isAuthenticated}
              loginUrl={loginUrl}
              disabled={soldOut}
            />
          </div>
        );
      })}
    </main>
  );
}
