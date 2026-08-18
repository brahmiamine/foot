import Link from "next/link";
import { communityT } from "@/i18n/community";
import type { Locale } from "@/i18n/config";
import { buildMemberLoginUrlForPath, getSsoSession } from "@/lib/ssoSession";
import { SupporterNewsCommunityService } from "@/services/SupporterNewsCommunityService";
import { setCommunityReactionAction, submitCommunityCommentAction } from "@/app/communaute/actions";
import styles from "./NewsCommunity.module.css";

const REACTIONS = [
  { value: "LIKE", emoji: "❤️" },
  { value: "FIRE", emoji: "🔥" },
  { value: "BRAVO", emoji: "👏" },
  { value: "SAD", emoji: "😢" },
] as const;

function formatDate(value: string, locale: Locale): string {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-TN" : "fr-TN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function NewsCommunity({
  teamId,
  newsId,
  locale,
  state,
}: {
  teamId: string;
  newsId: number;
  locale: Locale;
  state?: string;
}) {
  const session = await getSsoSession();
  const member = session?.role === "MEMBER" ? session : null;
  const articlePath = `/actualites/${newsId}` as const;
  const loginUrl = member ? null : await buildMemberLoginUrlForPath(articlePath);
  const engagement = await new SupporterNewsCommunityService().getEngagement(teamId, String(newsId), member?.id);
  const notice = state === "reaction"
    ? communityT(locale, "community.done.reaction")
    : state === "comment"
      ? communityT(locale, "community.done.comment")
      : state === "error"
        ? communityT(locale, "community.error")
        : null;

  return (
    <section className={styles.wrap} aria-labelledby={`news-community-${newsId}`}>
      <h2 className={styles.title} id={`news-community-${newsId}`}>{communityT(locale, "news.community")}</h2>
      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <div className={styles.reactions} aria-label={communityT(locale, "community.react")}>
        {REACTIONS.map((reaction) => member ? (
          <form action={setCommunityReactionAction} key={reaction.value}>
            <input type="hidden" name="targetType" value="NEWS" />
            <input type="hidden" name="targetId" value={newsId} />
            <input type="hidden" name="reaction" value={reaction.value} />
            <input type="hidden" name="returnTo" value={articlePath} />
            <button
              className={`${styles.reaction} ${engagement.userReaction === reaction.value ? styles.active : ""}`}
              type="submit"
              aria-pressed={engagement.userReaction === reaction.value}
            >
              {reaction.emoji} {engagement.counts[reaction.value]}
            </button>
          </form>
        ) : (
          <span className={styles.reaction} key={reaction.value}>{reaction.emoji} {engagement.counts[reaction.value]}</span>
        ))}
      </div>

      <div className={styles.comments}>
        <h3 className={styles.commentsTitle}>{communityT(locale, "news.comments")}</h3>
        {engagement.comments.length === 0 && <p className={styles.empty}>{communityT(locale, "news.noComments")}</p>}
        {engagement.comments.map((comment) => (
          <article className={styles.comment} key={comment.id}>
            <div className={styles.commentMeta}>
              <strong>{comment.authorName}</strong>
              <span>{formatDate(comment.createdAt, locale)}</span>
            </div>
            <p className={styles.commentBody}>{comment.body}</p>
          </article>
        ))}

        {member ? (
          <form action={submitCommunityCommentAction} className={styles.form}>
            <input type="hidden" name="targetType" value="NEWS" />
            <input type="hidden" name="targetId" value={newsId} />
            <input type="hidden" name="returnTo" value={articlePath} />
            <div className={styles.field}>
              <label htmlFor={`news-comment-${newsId}`}>{communityT(locale, "community.comment")}</label>
              <input id={`news-comment-${newsId}`} className={styles.input} name="body" maxLength={1000} required placeholder={communityT(locale, "community.commentPlaceholder")} />
            </div>
            <button className={styles.action} type="submit">{communityT(locale, "community.comment")}</button>
          </form>
        ) : (
          <Link className={styles.action} href={loginUrl ?? "/espace-membre"}>{communityT(locale, "community.login")}</Link>
        )}
        <p className={styles.hint}>{communityT(locale, "community.commentModerated")}</p>
      </div>
    </section>
  );
}
