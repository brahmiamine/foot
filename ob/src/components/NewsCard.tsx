import Link from "next/link";
import type { News } from "@/entities/News";
import { formatShortDate } from "@/lib/format";
import { resolveAssetUrl } from "@/lib/assets";
import { PlaceholderImage } from "./PlaceholderImage";
import styles from "./NewsSection.module.css";
import { getTranslator } from "@/i18n/server";

export async function NewsCard({ item }: { item: News }) {
  const { locale, t } = await getTranslator();
  const date = item.publishedAt ?? item.createdAt;

  return (
    <Link href={`/actualites/${item.id}`} className={styles.item}>
      <PlaceholderImage
        src={resolveAssetUrl(item.coverImage)}
        alt={item.title}
        label={t("common.photoSoon")}
        className={styles.image}
      />
      <div className={styles.body}>
        <h3 className={styles.title}>{item.title}</h3>
        {date && <div className={styles.date}>{formatShortDate(date, locale)}</div>}
      </div>
    </Link>
  );
}
