import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { PageChrome } from "@/components/PageChrome";
import { FollowToggle } from "@/components/FollowToggle";
import { buildMemberLoginUrlForPath, buildLogoutUrl } from "@/lib/ssoSession";
import { getSessionMember } from "@/lib/community/member";
import { getObTeam, getObTeams } from "@/lib/ob-team";
import { PublicPlayerService } from "@/services/PublicPlayerService";
import { BadgeService } from "@/services/BadgeService";
import { FollowService } from "@/services/FollowService";
import { NotificationPrefsService } from "@/services/NotificationPrefsService";
import { TicketPurchaseService } from "@/services/TicketPurchaseService";
import { resolveTicketDisplayInfo } from "@/app/mes-billets/ticketDisplay";
import { TicketList } from "@/app/mes-billets/TicketList";
import { NotificationPrefsForm } from "@/components/NotificationPrefsForm";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import shared from "@/components/shared.module.css";
import styles from "./espace-membre.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Espace membre — Olympique de Béja",
};

export default async function EspaceMembrePage() {
  const sessionMember = await getSessionMember();

  if (!sessionMember) {
    redirect(await buildMemberLoginUrlForPath("/espace-membre"));
  }
  const { session, member } = sessionMember;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const logoutUrl = buildLogoutUrl(`${proto}://${host}/`);

  const teams = await getObTeams();
  const squad = teams[0] ? await new PublicPlayerService().getSquad(teams[0].id) : [];
  const badgeService = new BadgeService();
  const followService = new FollowService();
  const obTeam = await getObTeam();

  const [badges, earnedBadgeIds, followedTeamIds, followedPlayerIds, notificationPrefs, myTickets] = await Promise.all([
    badgeService.listCatalog(),
    badgeService.getEarnedBadgeIds(session.id),
    followService.getFollowedIds(session.id, "TEAM"),
    followService.getFollowedIds(session.id, "PLAYER"),
    new NotificationPrefsService().getForUser(session.id),
    obTeam
      ? new TicketPurchaseService()
          .getTicketsForUser(session.id, obTeam.id)
          .then((tickets) => resolveTicketDisplayInfo(tickets, obTeam.id))
      : Promise.resolve([]),
  ]);

  const earnedBadges = badges.filter((b) => earnedBadgeIds.has(b.id));
  const players = squad.flatMap((group) => group.players);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            Mon espace OB
          </h1>

          <div className={`${shared.card} ${styles.profile}`}>
            <div>
              <p className={styles.name}>{session.name}</p>
              <p className={styles.email}>{session.email}</p>
            </div>
            <div className={styles.points}>
              <span className={styles.pointsValue}>{member.points.toLocaleString("fr-FR")}</span>
              <span className={styles.pointsLabel}>points</span>
            </div>
            <a href={logoutUrl} className={shared.btnOutline}>
              Se déconnecter
            </a>
          </div>

          <h2 className={shared.sectionSubtitle}>Mes billets</h2>
          {myTickets.length === 0 ? (
            <p className={shared.empty}>
              Aucun billet pour le moment. <Link href="/billetterie">Réservez vos places</Link> pour le prochain match à domicile.
            </p>
          ) : (
            <div style={{ marginBottom: 32 }}>
              <TicketList tickets={myTickets} />
            </div>
          )}

          <h2 className={shared.sectionSubtitle}>Mes badges</h2>
          {earnedBadges.length === 0 ? (
            <p className={shared.empty}>Aucun badge débloqué pour le moment.</p>
          ) : (
            <div className={styles.badgeRow}>
              {earnedBadges.map((badge) => (
                <div key={badge.id} className={styles.badgeChip} title={badge.description}>
                  <span>{badge.icon}</span> {badge.name}
                </div>
              ))}
            </div>
          )}
          <p className={styles.badgeLink}>
            <a href="/badges">Voir tous les badges →</a>
          </p>

          <h2 className={shared.sectionSubtitle}>Suivre les équipes de l&apos;OB</h2>
          <div className={styles.followRow}>
            {teams.map((team) => (
              <FollowToggle
                key={team.id}
                targetType="TEAM"
                targetId={team.id}
                label={`${team.nom} (${team.ageCategory === "seniors" ? "équipe première" : team.ageCategory})`}
                initialFollowing={followedTeamIds.has(team.id)}
              />
            ))}
          </div>

          {players.length > 0 && (
            <>
              <h2 className={shared.sectionSubtitle}>Suivre des joueurs</h2>
              <div className={styles.followRow}>
                {players.map((player) => (
                  <FollowToggle
                    key={player.id}
                    targetType="PLAYER"
                    targetId={player.id}
                    label={`${player.firstNameFr} ${player.lastNameFr}`}
                    initialFollowing={followedPlayerIds.has(player.id)}
                  />
                ))}
              </div>
            </>
          )}

          <h2 className={shared.sectionSubtitle}>Notifications</h2>
          <PushSubscribeButton />
          <div style={{ marginTop: 16, marginBottom: 32 }}>
            <NotificationPrefsForm initial={notificationPrefs} />
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
