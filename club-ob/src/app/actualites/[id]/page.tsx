import { getTranslator } from "@/i18n/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getObTeam } from "@/lib/ob-team";
import { assertSectionEnabled } from "@/lib/publicContentPolicy";
import { sanitizeRichTextHtml } from "@/lib/richTextSecurity";
import { PublicNewsService } from "@/services/PublicNewsService";
import { PageChrome } from "@/components/PageChrome";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import { NewsCommunity } from "@/components/NewsCommunity";
import { resolveAssetUrl } from "@/lib/assets";
import { formatShortDate } from "@/lib/format";
import styles from "./article.module.css";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ community?: string }>;
}) {
  const { locale, t } = await getTranslator();
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    notFound();
  }

  const team = await getObTeam();
  if (!team) {
    notFound();
  }
  await assertSectionEnabled(team.id, "NEWS");

  const article = await new PublicNewsService().getById(numericId, team.id);
  if (!article) {
    notFound();
  }

  const date = article.publishedAt ?? article.createdAt;
  const safeContentHtml = sanitizeRichTextHtml(article.contentHtml);
  const { community } = await searchParams;

  return (
    <PageChrome>
      <div className={styles.wrap}>
        <Link href="/actualites" className={styles.back}>
          {t("news.all")}
        </Link>
        <h1 className={styles.title}>{article.title}</h1>
        {date && <div className={styles.date}>{formatShortDate(date, locale)}</div>}
        <PlaceholderImage
          src={resolveAssetUrl(article.coverImage)}
          alt={article.title}
          label={t("common.photoSoon")}
          className={styles.cover}
        />
        <div className={styles.prose} dangerouslySetInnerHTML={{ __html: safeContentHtml }} />
        <NewsCommunity teamId={team.id} newsId={numericId} locale={locale} state={community} />
      </div>
    </PageChrome>
  );
}
