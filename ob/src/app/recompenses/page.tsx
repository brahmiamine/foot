import { PageChrome } from "@/components/PageChrome";
import { getSessionMember } from "@/lib/community/member";
import { buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import shared from "@/components/shared.module.css";
import styles from "./recompenses.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "OB Fan Rewards — Olympique de Béja",
};

const EARN_TABLE = [
  { label: "Créer un compte", points: 100 },
  { label: "Pronostic", points: 20 },
  { label: "Bonne prédiction", points: 100 },
  { label: "Vote", points: 10 },
  { label: "Quiz", points: 20 },
  { label: "Check-in stade", points: 200 },
  { label: "Achat boutique", points: 100, soon: true },
];

const TIERS = [
  { threshold: 500, label: "Badge exclusif" },
  { threshold: 1000, label: "Réduction boutique" },
  { threshold: 2500, label: "Avantage sponsor" },
  { threshold: 5000, label: "Invitation" },
  { threshold: 10000, label: "Expérience VIP" },
];

export default async function RecompensesPage() {
  const sessionMember = await getSessionMember();
  const loginUrl = await buildMemberLoginUrlForPath("/recompenses");
  const points = sessionMember?.member.points ?? 0;

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            🎁 OB Fan Rewards
          </h1>
          <p className={styles.subtitle}>Le programme de fidélité des supporters de l&apos;Olympique de Béja.</p>

          {!sessionMember && (
            <p className={styles.loginPrompt}>
              <a href={loginUrl}>Connectez-vous</a> pour voir votre progression.
            </p>
          )}

          <h2 className={shared.sectionSubtitle}>Comment gagner des points</h2>
          <div className={styles.earnTable}>
            {EARN_TABLE.map((row) => (
              <div key={row.label} className={styles.earnRow}>
                <span>
                  {row.label}
                  {row.soon && <span className={styles.soon}> (bientôt)</span>}
                </span>
                <span className={styles.points}>+{row.points}</span>
              </div>
            ))}
          </div>

          <h2 className={shared.sectionSubtitle}>Paliers à débloquer</h2>
          <div className={styles.tiers}>
            {TIERS.map((tier) => {
              const unlocked = points >= tier.threshold;
              return (
                <div key={tier.threshold} className={`${shared.card} ${styles.tier} ${unlocked ? styles.unlocked : ""}`}>
                  <div className={styles.tierPoints}>{tier.threshold.toLocaleString("fr-FR")} pts</div>
                  <div className={styles.tierLabel}>{tier.label}</div>
                  {sessionMember && (
                    <div className={styles.tierStatus}>
                      {unlocked ? "✓ Débloqué" : `Encore ${(tier.threshold - points).toLocaleString("fr-FR")} pts`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {sessionMember && (
            <p className={styles.note}>
              Vous avez <strong>{points.toLocaleString("fr-FR")}</strong> points. Les paliers débloqués (réduction
              boutique, avantage sponsor, invitation, expérience VIP) se retirent auprès d&apos;un responsable du
              club — présentez cet écran.
            </p>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
