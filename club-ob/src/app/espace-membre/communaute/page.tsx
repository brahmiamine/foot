import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { communityT } from "@/i18n/community";
import { getObTeam } from "@/lib/ob-team";
import { getSsoSession } from "@/lib/ssoSession";
import { SupporterCommunityService } from "@/services/SupporterCommunityService";
import { saveSupporterPreferencesAction } from "@/app/communaute/actions";
import styles from "../../communaute/community.module.css";

export const dynamic = "force-dynamic";

export default async function SupporterDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const locale = await getLocale();
  const session = await getSsoSession();
  const team = await getObTeam();
  if (!session || session.role !== "MEMBER" || !team) return null;

  const snapshot = await new SupporterCommunityService().getSnapshot(team.id, locale, {
    id: session.id,
    name: session.name,
  });
  const profile = snapshot.profile;
  const state = (await searchParams).community;
  const notice = state === "profile"
    ? communityT(locale, "community.done.profile")
    : state === "error"
      ? communityT(locale, "community.error")
      : null;

  return (
    <div>
      {notice && <div className={styles.notice} role="status">{notice}</div>}
      <section>
        <h2 className={styles.sectionTitle}>{communityT(locale, "supporter.dashboard")}</h2>
        <p className={styles.sectionHint}>{communityT(locale, "supporter.dashboardIntro")}</p>

        {profile && (
          <div className={styles.dashboardStrip}>
            <div className={styles.metric}><strong>{profile.points}</strong><span>{communityT(locale, "supporter.points")}</span></div>
            <div className={styles.metric}><strong>{profile.attendedMatches}</strong><span>{communityT(locale, "supporter.matches")}</span></div>
            <div className={styles.metric}><strong>{profile.predictionCount}</strong><span>{communityT(locale, "supporter.predictions")}</span></div>
            <div className={styles.metric}><strong>{profile.predictionHits}</strong><span>{communityT(locale, "supporter.correct")}</span></div>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{communityT(locale, "supporter.badges")}</h2>
        {snapshot.badges.length > 0 ? (
          <div className={styles.badgeLine}>
            {snapshot.badges.map((badge) => (
              <span key={badge.code} className={styles.badge} title={badge.description}>
                {badge.icon} {badge.label}
              </span>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>{communityT(locale, "supporter.badgesEmpty")}</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{communityT(locale, "supporter.preferences")}</h2>
        <form action={saveSupporterPreferencesAction} className={styles.formRow}>
          <input type="hidden" name="returnTo" value="/espace-membre/communaute" />
          <div className={styles.field}>
            <label htmlFor="favoritePlayerId">{communityT(locale, "supporter.favoritePlayer")}</label>
            <select id="favoritePlayerId" className={styles.select} name="favoritePlayerId" defaultValue={profile?.favoritePlayerId ?? ""}>
              <option value="">—</option>
              {snapshot.activePlayers.map((player) => (
                <option key={player.id} value={player.id}>{player.number ? `#${player.number} ` : ""}{player.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="favoriteStand">{communityT(locale, "supporter.favoriteStand")}</label>
            <input id="favoriteStand" className={styles.input} name="favoriteStand" maxLength={120} defaultValue={profile?.favoriteStand ?? ""} />
          </div>
          <button className={styles.action} type="submit">{communityT(locale, "supporter.save")}</button>
        </form>
      </section>

      <section className={styles.section}>
        <Link href="/communaute" className={styles.action}>{communityT(locale, "supporter.openCommunity")}</Link>
      </section>
    </div>
  );
}
