import Link from "next/link";
import { listOpenMatches } from "@/lib/tickets";
import { formatMatchDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const matches = await listOpenMatches();

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>Billetterie</h1>
      <p style={{ color: "var(--tk-text-muted)", marginTop: 0, marginBottom: "1.5rem" }}>
        Achetez vos billets pour les prochains matchs — tous clubs confondus.
      </p>

      {matches.length === 0 ? (
        <div
          style={{
            background: "var(--tk-surface)",
            border: "1px solid var(--tk-border)",
            borderRadius: "var(--tk-radius-md)",
            padding: "1.5rem",
            color: "var(--tk-text-muted)",
          }}
        >
          Aucune vente de billets n&rsquo;est ouverte pour le moment.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.85rem" }}>
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                href={`/match/${match.id}`}
                style={{
                  display: "block",
                  background: "var(--tk-surface)",
                  border: "1px solid var(--tk-border)",
                  borderRadius: "var(--tk-radius-md)",
                  padding: "1.1rem 1.25rem",
                  boxShadow: "var(--tk-shadow-sm)",
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginBottom: 6 }}>
                  {match.date ? formatMatchDateTime(match.date) : "Date à confirmer"}
                  {match.stadium ? ` · ${match.stadium}` : ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 700, fontSize: "1.02rem" }}>
                  <span>{match.homeTeamName}</span>
                  <span style={{ color: "var(--tk-text-subtle)", fontWeight: 500 }}>vs</span>
                  <span>{match.awayTeamName}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
