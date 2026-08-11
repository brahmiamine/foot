import { getObTeam } from "@/lib/ob-team";
import { PublicAcademyService } from "@/services/PublicAcademyService";
import { getRecruitmentUrl } from "@/lib/publicForms";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./recrutement.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recrutement — Olympique de Béja",
};

export default async function RecrutementPage() {
  const team = await getObTeam();
  const needs = team ? await new PublicAcademyService().getActiveRecruitmentNeeds(team.id) : [];
  const recruitmentUrl = team ? getRecruitmentUrl(team.id) : null;

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Recrutement
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            Le club recrute des joueurs pour certaines catégories, jeunes et seniors.
          </p>

          {needs.length === 0 ? (
            <p className={shared.empty}>Aucun poste ouvert pour le moment.</p>
          ) : (
            <div className={styles.grid}>
              {needs.map((need) => (
                <div key={need.id} className={`${shared.card} ${styles.card}`}>
                  <div className={styles.category}>{need.category}</div>
                  <div className={styles.position}>{need.position}</div>
                  {need.descriptionFr && <div className={styles.description}>{need.descriptionFr}</div>}
                </div>
              ))}
            </div>
          )}

          {recruitmentUrl && (
            <div className={styles.cta}>
              <a href={recruitmentUrl} className={shared.btnPrimary}>
                Postuler
              </a>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
