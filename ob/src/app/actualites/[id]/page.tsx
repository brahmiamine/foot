import { notFound } from "next/navigation";
import Link from "next/link";
import { getObTeam } from "@/lib/ob-team";
import { PublicNewsService } from "@/services/PublicNewsService";
import { PageChrome } from "@/components/PageChrome";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import { ReactionBar } from "@/components/ReactionBar";
import { CommentSection } from "@/components/CommentSection";
import { CommunityFeedService } from "@/services/CommunityFeedService";
import { getSessionMember } from "@/lib/community/member";
import { resolveAssetUrl } from "@/lib/assets";
import { formatShortDate } from "@/lib/format";
import styles from "./article.module.css";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    notFound();
  }

  const team = await getObTeam();
  if (!team) {
    notFound();
  }

  const article = await new PublicNewsService().getById(numericId, team.id);
  if (!article) {
    notFound();
  }

  const date = article.publishedAt ?? article.createdAt;

  const sessionMember = await getSessionMember();
  const targetId = String(article.id);
  const feedService = new CommunityFeedService();
  const [reactionsByTarget, commentCounts] = await Promise.all([
    feedService.reactionSummaries("NEWS", [targetId], sessionMember?.session.id ?? null),
    feedService.commentCounts("NEWS", [targetId]),
  ]);

  return (
    <PageChrome>
      <div className={styles.wrap}>
        <Link href="/actualites" className={styles.back}>
          ← Toutes les actualités
        </Link>
        <h1 className={styles.title}>{article.title}</h1>
        {date && <div className={styles.date}>{formatShortDate(date)}</div>}
        <PlaceholderImage
          src={resolveAssetUrl(article.coverImage)}
          alt={article.title}
          label="Photo à venir"
          className={styles.cover}
        />
        {/* Contenu HTML rédigé par le club via l'éditeur riche de teamManager (Tiptap) — CMS interne, pas une saisie publique. */}
        <div className={styles.prose} dangerouslySetInnerHTML={{ __html: article.contentHtml }} />

        <div className={styles.engagement}>
          <ReactionBar
            targetType="NEWS"
            targetId={targetId}
            initialReactions={reactionsByTarget.get(targetId) ?? []}
            loggedIn={!!sessionMember}
          />
          <CommentSection
            targetType="NEWS"
            targetId={targetId}
            commentCount={commentCounts.get(targetId) ?? 0}
            loggedIn={!!sessionMember}
          />
        </div>
      </div>
    </PageChrome>
  );
}
