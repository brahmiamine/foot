import Link from "next/link";
import { PageChrome } from "@/components/PageChrome";
import { getObTeam } from "@/lib/ob-team";
import { buildMemberLoginUrlForPath, getSsoSession } from "@/lib/ssoSession";
import { getLocale } from "@/i18n/server";
import { communityT } from "@/i18n/community";
import { SupporterCommunityService, type CommunityMatch, type CommunityPost } from "@/services/SupporterCommunityService";
import {
  joinSupporterGroupAction,
  setCommunityReactionAction,
  submitCommunityCommentAction,
  submitCommunityPostAction,
  submitPredictionAction,
  voteManOfMatchAction,
  votePollAction,
} from "./actions";
import styles from "./community.module.css";

export const dynamic = "force-dynamic";

const REACTIONS = [
  { value: "LIKE", emoji: "❤️" },
  { value: "FIRE", emoji: "🔥" },
  { value: "BRAVO", emoji: "👏" },
  { value: "SAD", emoji: "😢" },
] as const;

function formatDate(value: string | null, locale: "fr" | "ar"): string {
  if (!value) return "";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-TN" : "fr-TN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MatchTitle({ match }: { match: CommunityMatch }) {
  return <span className={styles.teams}>{match.homeName} — {match.awayName}</span>;
}

function CommunityPostView({ post, member, locale }: { post: CommunityPost; member: boolean; locale: "fr" | "ar" }) {
  return (
    <article className={styles.post}>
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.postImage} src={post.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      )}
      <div className={styles.postBody}>
        <div className={styles.postMeta}>
          <strong>{post.authorName}</strong>
          <span>{formatDate(post.createdAt, locale)}</span>
          {post.sourceType === "CLUB" && <span>{communityT(locale, "community.clubPost")}</span>}
          {post.visibility === "MEMBER" && <span>{communityT(locale, "community.membersOnly")}</span>}
        </div>
        {post.title && <h3 className={styles.postTitle}>{post.title}</h3>}
        <div className={styles.postText}>{post.body}</div>

        <div className={styles.reactions} aria-label={communityT(locale, "community.react")}>
          {REACTIONS.map((reaction) => member ? (
            <form action={setCommunityReactionAction} key={reaction.value}>
              <input type="hidden" name="targetType" value="POST" />
              <input type="hidden" name="targetId" value={post.id} />
              <input type="hidden" name="reaction" value={reaction.value} />
              <input type="hidden" name="returnTo" value="/communaute" />
              <button
                type="submit"
                className={`${styles.reaction} ${post.userReaction === reaction.value ? styles.reactionActive : ""}`}
                aria-pressed={post.userReaction === reaction.value}
              >
                {reaction.emoji} {post.reactions[reaction.value]}
              </button>
            </form>
          ) : (
            <span className={styles.reaction} key={reaction.value}>{reaction.emoji} {post.reactions[reaction.value]}</span>
          ))}
        </div>

        <div className={styles.comments}>
          {post.comments.map((comment) => (
            <div className={styles.comment} key={comment.id}>
              <div className={styles.commentAuthor}>{comment.authorName}</div>
              <p className={styles.commentText}>{comment.body}</p>
            </div>
          ))}
          {member && (
            <form action={submitCommunityCommentAction} className={styles.formRow}>
              <input type="hidden" name="targetType" value="POST" />
              <input type="hidden" name="targetId" value={post.id} />
              <input type="hidden" name="returnTo" value="/communaute" />
              <div className={styles.field}>
                <label htmlFor={`comment-${post.id}`}>{communityT(locale, "community.comment")}</label>
                <input id={`comment-${post.id}`} className={styles.input} name="body" maxLength={1000} required placeholder={communityT(locale, "community.commentPlaceholder")} />
              </div>
              <button className={styles.action} type="submit">{communityT(locale, "community.comment")}</button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const locale = await getLocale();
  const team = await getObTeam();
  if (!team) return null;

  const session = await getSsoSession();
  const member = session?.role === "MEMBER" ? { id: session.id, name: session.name } : null;
  const snapshot = await new SupporterCommunityService().getSnapshot(team.id, locale, member);
  const loginUrl = member ? null : await buildMemberLoginUrlForPath("/communaute");
  const state = (await searchParams).community;
  const notice = state === "error"
    ? communityT(locale, "community.error")
    : state && ["prediction", "vote", "poll", "post", "comment", "reaction", "profile", "group"].includes(state)
      ? communityT(locale, `community.done.${state}` as Parameters<typeof communityT>[1])
      : null;

  return (
    <PageChrome>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>{communityT(locale, "community.title")}</h1>
          <p className={styles.heroLead}>{communityT(locale, "community.subtitle")}</p>
          <div className={styles.heroActions}>
            {member ? (
              <Link href="/espace-membre/communaute" className={styles.action}>{communityT(locale, "community.memberCta")}</Link>
            ) : (
              <Link href={loginUrl ?? "/espace-membre"} className={styles.action}>{communityT(locale, "community.login")}</Link>
            )}
          </div>
        </div>
      </header>

      <div className={styles.content}>
        {notice && <div className={styles.notice} role="status">{notice}</div>}

        {snapshot.profile && (
          <div className={styles.dashboardStrip} aria-label={communityT(locale, "supporter.dashboard")}>
            <div className={styles.metric}><strong>{snapshot.profile.points}</strong><span>{communityT(locale, "supporter.points")}</span></div>
            <div className={styles.metric}><strong>{snapshot.profile.attendedMatches}</strong><span>{communityT(locale, "supporter.matches")}</span></div>
            <div className={styles.metric}><strong>{snapshot.profile.predictionCount}</strong><span>{communityT(locale, "supporter.predictions")}</span></div>
            <div className={styles.metric}><strong>{snapshot.profile.predictionHits}</strong><span>{communityT(locale, "supporter.correct")}</span></div>
            <div className={styles.badgeLine}>{snapshot.badges.map((badge) => <span className={styles.badge} title={badge.description} key={badge.code}>{badge.icon} {badge.label}</span>)}</div>
          </div>
        )}

        <div className={styles.layout}>
          <main className={styles.main}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{communityT(locale, "community.predictions")}</h2>
              <p className={styles.sectionHint}>{communityT(locale, "community.predictionHint")}</p>
              <div className={styles.matchList}>
                {snapshot.upcomingMatches.length === 0 && <p className={styles.empty}>{communityT(locale, "community.empty")}</p>}
                {snapshot.upcomingMatches.map((match) => (
                  <article className={styles.match} key={match.id}>
                    <div className={styles.matchHeader}>
                      <MatchTitle match={match} />
                      <span className={styles.date}>{formatDate(match.date, locale)}</span>
                    </div>
                    {member ? (
                      <form action={submitPredictionAction} className={styles.formRow}>
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="returnTo" value="/communaute" />
                        <div className={styles.field} style={{ flex: "0 1 auto" }}>
                          <label htmlFor={`home-${match.id}`}>{match.homeName}</label>
                          <input id={`home-${match.id}`} className={styles.scoreInput} type="number" name="homeScore" min={0} max={20} defaultValue={match.prediction?.homeScore ?? 0} required />
                        </div>
                        <div className={styles.field} style={{ flex: "0 1 auto" }}>
                          <label htmlFor={`away-${match.id}`}>{match.awayName}</label>
                          <input id={`away-${match.id}`} className={styles.scoreInput} type="number" name="awayScore" min={0} max={20} defaultValue={match.prediction?.awayScore ?? 0} required />
                        </div>
                        <div className={styles.field}>
                          <label htmlFor={`scorer-${match.id}`}>{communityT(locale, "community.firstScorer")}</label>
                          <select id={`scorer-${match.id}`} className={styles.select} name="firstScorerId" defaultValue={match.prediction?.firstScorerId ?? ""}>
                            <option value="">—</option>
                            {snapshot.activePlayers.map((player) => <option key={player.id} value={player.id}>{player.number ? `#${player.number} ` : ""}{player.name}</option>)}
                          </select>
                        </div>
                        <button className={styles.action} type="submit">{communityT(locale, "community.savePrediction")}</button>
                      </form>
                    ) : (
                      <Link href={loginUrl ?? "/espace-membre"} className={styles.action}>{communityT(locale, "community.login")}</Link>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{communityT(locale, "community.motm")}</h2>
              <p className={styles.sectionHint}>{communityT(locale, "community.motmHint")}</p>
              <div className={styles.matchList}>
                {snapshot.finishedMatches.filter((match) => (match.eligiblePlayers?.length ?? 0) > 0).map((match) => (
                  <article className={styles.match} key={match.id}>
                    <div className={styles.matchHeader}>
                      <MatchTitle match={match} />
                      <strong>{match.homeScore} — {match.awayScore}</strong>
                    </div>
                    {member ? (
                      <form action={voteManOfMatchAction} className={styles.formRow}>
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="returnTo" value="/communaute" />
                        <div className={styles.field}>
                          <label htmlFor={`motm-${match.id}`}>{communityT(locale, "community.motm")}</label>
                          <select id={`motm-${match.id}`} className={styles.select} name="playerId" defaultValue={match.votePlayerId ?? ""} required>
                            <option value="" disabled>—</option>
                            {match.eligiblePlayers?.map((player) => <option key={player.id} value={player.id}>{player.number ? `#${player.number} ` : ""}{player.name}</option>)}
                          </select>
                        </div>
                        <button className={styles.action} type="submit">{communityT(locale, "community.vote")}</button>
                      </form>
                    ) : <Link href={loginUrl ?? "/espace-membre"} className={styles.action}>{communityT(locale, "community.login")}</Link>}
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{communityT(locale, "community.polls")}</h2>
              <div className={styles.pollList}>
                {snapshot.polls.length === 0 && <p className={styles.empty}>{communityT(locale, "community.empty")}</p>}
                {snapshot.polls.map((poll) => (
                  <article className={styles.poll} key={poll.id}>
                    <p className={styles.pollQuestion}>{poll.question}</p>
                    {member ? (
                      <form action={votePollAction}>
                        <input type="hidden" name="pollId" value={poll.id} />
                        <input type="hidden" name="returnTo" value="/communaute" />
                        <div className={styles.optionList}>
                          {poll.options.map((option) => (
                            <label className={`${styles.option} ${poll.selectedOptionId === option.id ? styles.optionSelected : ""}`} key={option.id}>
                              <span><input type="radio" name="optionId" value={option.id} defaultChecked={poll.selectedOptionId === option.id} required /> {option.label}</span>
                              <span className={styles.optionCount}>{option.votes}</span>
                            </label>
                          ))}
                        </div>
                        <button className={styles.action} style={{ marginTop: 12 }} type="submit">{communityT(locale, "community.vote")}</button>
                      </form>
                    ) : (
                      <div className={styles.optionList}>{poll.options.map((option) => <div className={styles.option} key={option.id}><span>{option.label}</span><span className={styles.optionCount}>{option.votes}</span></div>)}</div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{communityT(locale, "community.feed")}</h2>
              {member && (
                <form action={submitCommunityPostAction} className={styles.compose}>
                  <input type="hidden" name="returnTo" value="/communaute" />
                  <p className={styles.sectionHint}>{communityT(locale, "community.postPrompt")}</p>
                  <div className={styles.composeFields}>
                    <textarea className={styles.textarea} name="body" maxLength={1500} required placeholder={communityT(locale, "community.postPlaceholder")} />
                    <input className={styles.input} type="url" name="imageUrl" maxLength={1000} placeholder={communityT(locale, "community.photoUrl")} pattern="https://.*" />
                    <button className={styles.action} type="submit">{communityT(locale, "community.submitPost")}</button>
                  </div>
                </form>
              )}
              <div className={styles.feed}>
                {snapshot.posts.length === 0 && <p className={styles.empty}>{communityT(locale, "community.empty")}</p>}
                {snapshot.posts.map((post) => <CommunityPostView key={post.id} post={post} member={Boolean(member)} locale={locale} />)}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{communityT(locale, "community.groups")}</h2>
              <div className={styles.groupList}>
                {snapshot.groups.length === 0 && <p className={styles.empty}>{communityT(locale, "community.empty")}</p>}
                {snapshot.groups.map((group) => (
                  <article className={styles.group} key={group.id}>
                    <div className={styles.matchHeader}><strong>{group.name}</strong><span className={styles.date}>{group.members} membre(s)</span></div>
                    {group.description && <p className={styles.sectionHint}>{group.description}</p>}
                    {group.nextEvent && <p><strong>{communityT(locale, "community.nextEvent")} :</strong> {group.nextEvent.title} · {formatDate(group.nextEvent.startsAt, locale)}{group.nextEvent.location ? ` · ${group.nextEvent.location}` : ""}</p>}
                    {member && !group.joined && (
                      <form action={joinSupporterGroupAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="returnTo" value="/communaute" />
                        <button className={styles.action} type="submit">{communityT(locale, "community.join")}</button>
                      </form>
                    )}
                    {group.joined && <strong>{communityT(locale, "community.joined")}</strong>}
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className={styles.aside}>
            <section className={styles.sidePanel}>
              <h2>{communityT(locale, "community.fanOfMonth")}</h2>
              {snapshot.fanOfMonth ? (
                <>
                  <p className={styles.fanName}>{snapshot.fanOfMonth.displayName}</p>
                  <p>{communityT(locale, "community.points", { count: snapshot.fanOfMonth.points })} · {communityT(locale, "community.attendance", { count: snapshot.fanOfMonth.attendedMatches })}</p>
                </>
              ) : <p className={styles.empty}>{communityT(locale, "community.empty")}</p>}
            </section>
            <section className={styles.sidePanel}>
              <h2>{communityT(locale, "community.leaderboard")}</h2>
              <ol className={styles.leaderboard}>
                {snapshot.leaderboard.map((entry) => (
                  <li key={`${entry.rank}-${entry.displayName}`}>
                    <span className={styles.rank}>{entry.rank}</span>
                    <span className={styles.leaderName}>{entry.displayName}</span>
                    <strong>{entry.points}</strong>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </PageChrome>
  );
}
