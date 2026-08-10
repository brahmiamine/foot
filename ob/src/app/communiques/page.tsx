import { getObTeam } from "@/lib/ob-team";
import { PublicAnnouncementService } from "@/services/PublicAnnouncementService";
import { formatShortDate } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./communiques.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Communiqués officiels — Olympique de Béja",
};

const CATEGORY_LABELS: Record<string, string> = {
  DECISION: "Décision du club",
  PROGRAMME: "Changement de programme",
  ADMINISTRATIF: "Information administrative",
  RECRUTEMENT: "Recrutement",
  SANCTION: "Sanction",
  ANNONCE: "Annonce officielle",
};

export default async function CommuniquesPage() {
  const team = await getObTeam();
  const announcements = team ? await new PublicAnnouncementService().getPublished(team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            Communiqués officiels
          </h1>

          {announcements.length === 0 ? (
            <p className={shared.empty}>Aucun communiqué pour le moment.</p>
          ) : (
            <div className={styles.list}>
              {announcements.map((announcement) => (
                <div key={announcement.id} className={`${shared.card} ${styles.item}`}>
                  <div className={styles.meta}>
                    <span className={styles.category}>{CATEGORY_LABELS[announcement.category] ?? announcement.category}</span>
                    {announcement.publishedAt && <span className={styles.date}>{formatShortDate(announcement.publishedAt)}</span>}
                  </div>
                  <div className={styles.title}>{announcement.title}</div>
                  {/* Contenu HTML rédigé par le club via l'éditeur riche de teamManager (Tiptap) — CMS interne, pas une saisie publique. */}
                  <div className={styles.content} dangerouslySetInnerHTML={{ __html: announcement.contentHtml }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
