import Link from "next/link";
import { listUpcomingMatchesWithTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "Date à confirmer";
  return new Date(date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
}

export default async function HomePage() {
  const matches = await listUpcomingMatchesWithTickets();

  return (
    <main className="tk-container">
      <h1 style={{ fontSize: "1.3rem" }}>Matchs à venir</h1>
      <p style={{ color: "var(--tk-text-muted)", fontSize: "0.88rem" }}>
        Billetterie multi-clubs : le club organisateur de chaque match décide de ses catégories et de ses tarifs.
      </p>

      {matches.length === 0 && (
        <div className="tk-card">
          <p style={{ margin: 0, color: "var(--tk-text-muted)" }}>Aucune billetterie ouverte pour le moment.</p>
        </div>
      )}

      {matches.map((match) => (
        <Link key={match.matchId} href={`/match/${match.matchId}`} style={{ textDecoration: "none" }}>
          <div className="tk-card">
            <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginBottom: 6 }}>{formatDate(match.date)}</div>
            <div style={{ fontWeight: 600 }}>
              {match.homeTeam.nom} <span style={{ color: "var(--tk-text-muted)", fontWeight: 400 }}>vs</span> {match.awayTeam.nom}
            </div>
            <span className="tk-badge" style={{ marginTop: 8, display: "inline-block" }}>
              {match.categoriesCount} catégorie{match.categoriesCount > 1 ? "s" : ""} disponible{match.categoriesCount > 1 ? "s" : ""}
            </span>
          </div>
        </Link>
      ))}
    </main>
  );
}
