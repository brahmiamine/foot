import Link from "next/link";
import { listOpenMatches } from "@/lib/tickets";
import { formatMatchDateTime } from "@/lib/format";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { locale, t } = await getTranslator();
  const matches = await listOpenMatches();

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{t("site.title")}</h1>
      <p style={{ color: "var(--tk-text-muted)", marginTop: 0, marginBottom: "1.5rem" }}>
        {t("home.subtitle")}
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
          {t("home.empty")}
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
                  {match.date ? formatMatchDateTime(match.date, locale) : t("common.dateTbc")}
                  {match.stadium ? ` · ${localized(locale, match.stadium, match.stadiumAr)}` : ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 700, fontSize: "1.02rem" }}>
                  <span>{localized(locale, match.homeTeamName, match.homeTeamNameAr)}</span>
                  <span style={{ color: "var(--tk-text-subtle)", fontWeight: 500 }}>{t("common.vs")}</span>
                  <span>{localized(locale, match.awayTeamName, match.awayTeamNameAr)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
