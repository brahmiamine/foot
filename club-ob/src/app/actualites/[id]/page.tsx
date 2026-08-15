import { getTranslator } from "@/i18n/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getObTeam } from "@/lib/ob-team";
import { sanitizeRichTextHtml } from "@/lib/richTextSecurity";
import { PublicNewsService } from "@/services/PublicNewsService";
import { PageChrome } from "@/components/PageChrome";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import { resolveAssetUrl } from "@/lib/assets";
import { formatShortDate } from "@/lib/format";
import styles from "./article.module.css";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
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

  const article = await new PublicNewsService().getById(numericId, team.id);
  if (!article) {
    notFound();
  }

  const date = article.publishedAt ?? article.createdAt;
  const safeContentHtml = sanitizeRichTextHtml(article.contentHtml);

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
      </div>
    </PageChrome>
  );
}
