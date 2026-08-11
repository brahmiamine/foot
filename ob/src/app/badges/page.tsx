import { PageChrome } from "@/components/PageChrome";
import { BadgeService } from "@/services/BadgeService";
import { getSsoSession } from "@/lib/ssoSession";
import shared from "@/components/shared.module.css";
import styles from "./badges.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Badges OB — Olympique de Béja",
};

export default async function BadgesPage() {
  const service = new BadgeService();
  const session = await getSsoSession();
  const [badges, earned] = await Promise.all([
    service.listCatalog(),
    session ? service.getEarnedBadgeIds(session.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            🎖️ Badges OB
          </h1>
          <p className={styles.subtitle}>Les badges de l&apos;Olympique de Béja, à débloquer en suivant le club.</p>

          <div className={styles.grid}>
            {badges.map((badge) => {
              const unlocked = earned.has(badge.id);
              return (
                <div key={badge.id} className={`${shared.card} ${styles.badge} ${unlocked ? styles.unlocked : styles.locked}`}>
                  <div className={styles.icon}>{badge.icon}</div>
                  <div className={styles.name}>{badge.name}</div>
                  <div className={styles.description}>{badge.description}</div>
                  {!unlocked && session && <div className={styles.lockedLabel}>Pas encore débloqué</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
