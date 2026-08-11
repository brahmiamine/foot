import { redirect } from "next/navigation";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { listMyTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "Date à confirmer";
  return new Date(date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payé",
  CANCELLED: "Annulé",
  USED: "Utilisé",
};

export default async function MyTicketsPage() {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
    redirect(await buildMemberLoginUrlForPath("/mes-billets"));
  }

  const tickets = await listMyTickets(session.id);

  return (
    <main className="tk-container">
      <h1 style={{ fontSize: "1.3rem" }}>Mes billets</h1>

      {tickets.length === 0 && (
        <div className="tk-card">
          <p style={{ margin: 0, color: "var(--tk-text-muted)" }}>Vous n&apos;avez pas encore de billet.</p>
        </div>
      )}

      {tickets.map((ticket) => (
        <div key={ticket.id} className="tk-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <strong>
              {ticket.homeTeam} vs {ticket.awayTeam}
            </strong>
            <span className="tk-badge">{STATUS_LABELS[ticket.status] ?? ticket.status}</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)", margin: "6px 0" }}>{formatDate(ticket.matchDate)}</p>
          <p style={{ fontSize: "0.85rem", margin: "4px 0" }}>
            {ticket.categoryName} — {Number(ticket.price).toFixed(3)} DT
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--tk-text-muted)", margin: 0 }}>Référence {ticket.reference}</p>
        </div>
      ))}
    </main>
  );
}
