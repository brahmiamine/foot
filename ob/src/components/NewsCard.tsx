import Link from "next/link";
import type { News } from "@/entities/News";
import { formatShortDate } from "@/lib/format";
import { resolveAssetUrl } from "@/lib/assets";
import { PlaceholderImage } from "./PlaceholderImage";
import styles from "./NewsSection.module.css";

export function NewsCard({ item }: { item: News }) {
  const date = item.publishedAt ?? item.createdAt;

  return (
    <Link href={`/actualites/${item.id}`} className={styles.item}>
      <PlaceholderImage
        src={resolveAssetUrl(item.coverImage)}
        alt={item.title}
        label="Photo à venir"
        className={styles.image}
      />
      <div className={styles.body}>
        <h3 className={styles.title}>{item.title}</h3>
        {date && <div className={styles.date}>{formatShortDate(date)}</div>}
      </div>
    </Link>
  );
}
