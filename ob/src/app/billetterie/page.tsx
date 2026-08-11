import Link from "next/link";
import { getObTeam } from "@/lib/ob-team";
import { TicketingService } from "@/services/TicketingService";
import { formatMatchDateTime } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./billetterie.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billetterie — Olympique de Béja",
};

export default async function BilletteriePage() {
  const team = await getObTeam();
  const events = team ? await new TicketingService().getOpenEvents(team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Billetterie
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            Réservez vos billets pour les prochains matchs à domicile. Réservation gratuite, sans paiement en ligne.
          </p>

          {events.length === 0 ? (
            <p className={shared.empty}>Aucune billetterie ouverte pour le moment. Revenez bientôt !</p>
          ) : (
            <div className={styles.grid}>
              {events.map(({ event, matchLabel, matchDate, isHome }) => (
                <Link key={event.id} href={`/billetterie/${event.id}`} className={`${shared.card} ${styles.card}`}>
                  <div className={styles.badge}>{isHome ? "Domicile" : "Extérieur"}</div>
                  <div className={styles.match}>{matchLabel}</div>
                  <div className={styles.date}>{matchDate ? formatMatchDateTime(matchDate) : "Date à confirmer"}</div>
                  <div className={styles.cta}>Réserver mes billets →</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
