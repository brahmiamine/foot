import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { sanitizeRichTextHtml } from "@/lib/richTextSecurity";
import { PublicAnnouncementService } from "@/services/PublicAnnouncementService";
import { formatShortDate } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./communiques.module.css";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.releases");

const CATEGORY_LABELS = { DECISION: "release.decision", PROGRAMME: "release.schedule", ADMINISTRATIF: "release.admin", RECRUTEMENT: "release.recruitment", SANCTION: "release.sanction", ANNONCE: "release.official" } as const;

export default async function CommuniquesPage() {
  const { locale, t } = await getTranslator();
  const team = await getObTeam();
  const announcements = team ? await new PublicAnnouncementService().getPublished(team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            {t("releases.title")}
          </h1>

          {announcements.length === 0 ? (
            <p className={shared.empty}>{t("releases.empty")}</p>
          ) : (
            <div className={styles.list}>
              {announcements.map((announcement) => (
                <div key={announcement.id} className={`${shared.card} ${styles.item}`}>
                  <div className={styles.meta}>
                    <span className={styles.category}>{announcement.category in CATEGORY_LABELS ? t(CATEGORY_LABELS[announcement.category as keyof typeof CATEGORY_LABELS]) : announcement.category}</span>
                    {announcement.publishedAt && <span className={styles.date}>{formatShortDate(announcement.publishedAt, locale)}</span>}
                  </div>
                  <div className={styles.title}>{announcement.title}</div>
                  <div
                    className={styles.content}
                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(announcement.contentHtml) }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
