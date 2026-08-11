import { PageChrome } from "@/components/PageChrome";
import { FanWallForm } from "@/components/FanWallForm";
import { FanWallService } from "@/services/FanWallService";
import { getSessionMember } from "@/lib/community/member";
import { buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { formatFullDateTime } from "@/lib/format";
import shared from "@/components/shared.module.css";
import styles from "./tribune.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "La tribune des supporters — Olympique de Béja",
};

export default async function TribunePage() {
  const sessionMember = await getSessionMember();
  const [items, loginUrl] = await Promise.all([
    new FanWallService().listPublished(),
    buildMemberLoginUrlForPath("/tribune"),
  ]);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            📣 La tribune des supporters
          </h1>
          <p className={styles.subtitle}>&quot;Tous derrière l&apos;OB ! 💚❤️&quot;</p>

          {sessionMember ? (
            sessionMember.member.isBlocked ? (
              <p className={styles.blocked}>Votre compte a été suspendu de la communauté.</p>
            ) : (
              <FanWallForm />
            )
          ) : (
            <p className={styles.loginPrompt}>
              <a href={loginUrl}>Connectez-vous</a> pour envoyer votre message à la tribune.
            </p>
          )}

          {items.length === 0 ? (
            <p className={shared.empty}>La tribune est vide pour le moment.</p>
          ) : (
            <div className={styles.grid}>
              {items.map((item) => (
                <div key={item.id} className={`${shared.card} ${styles.item}`}>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externe arbitraire soumise par un supporter, pas de domaine à préconfigurer pour next/image
                    <img src={item.imageUrl} alt="" className={styles.media} />
                  )}
                  {item.videoUrl && <video src={item.videoUrl} controls className={styles.media} />}
                  {item.message && <p className={styles.message}>&quot;{item.message}&quot;</p>}
                  <div className={styles.meta}>
                    {item.authorName} — {formatFullDateTime(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
