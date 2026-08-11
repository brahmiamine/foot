import { getObTeam } from "@/lib/ob-team";
import { NewsletterDigestService } from "@/services/NewsletterDigestService";
import { NewsletterSubscribeForm } from "@/components/NewsletterSubscribeForm";
import { PageChrome } from "@/components/PageChrome";
import { formatShortDate, formatFullDateTime } from "@/lib/format";
import shared from "@/components/shared.module.css";
import styles from "./newsletter.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "OB News — Olympique de Béja",
};

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ desabonne?: string }>;
}) {
  const { desabonne } = await searchParams;
  const team = await getObTeam();

  if (!team) {
    return (
      <PageChrome>
        <div className={shared.sectionPad}>
          <div className={shared.container}>
            <p className={shared.empty}>Club non configuré.</p>
          </div>
        </div>
      </PageChrome>
    );
  }

  const digest = await new NewsletterDigestService().compose(team);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            📰 OB News
          </h1>
          <p className={styles.subtitle}>Le résumé hebdomadaire de l&apos;Olympique de Béja.</p>

          {desabonne === "1" && <p className={styles.info}>Vous avez été désabonné d&apos;OB News.</p>}

          <div className={styles.subscribe}>
            <NewsletterSubscribeForm />
          </div>

          <div className={`${shared.card} ${styles.digest}`}>
            <div className={styles.weekLabel}>{digest.weekLabel}</div>

            {digest.news.length > 0 && (
              <section>
                <h2>📰 Les dernières nouvelles</h2>
                <ul>
                  {digest.news.map((n) => (
                    <li key={n.id}>{n.title}</li>
                  ))}
                </ul>
              </section>
            )}

            {digest.results.length > 0 && (
              <section>
                <h2>⚽ Résultats</h2>
                <ul>
                  {digest.results.map((m) => (
                    <li key={m.id}>
                      {m.homeTeam?.nom} {m.scoreHome} - {m.scoreAway} {m.awayTeam?.nom}
                      {m.date ? ` (${formatShortDate(m.date)})` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {digest.upcoming.length > 0 && (
              <section>
                <h2>📅 Prochains matchs</h2>
                <ul>
                  {digest.upcoming.map((m) => (
                    <li key={m.id}>
                      {m.homeTeam?.nom} vs {m.awayTeam?.nom}
                      {m.date ? ` — ${formatFullDateTime(m.date)}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {digest.standings.length > 0 && (
              <section>
                <h2>🏆 Classement</h2>
                <ol>
                  {digest.standings.map((row) => (
                    <li key={row.teamId}>
                      {row.team} — {row.points} pts
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
