import type { News } from "@/entities/News";
import { formatShortDate } from "@/lib/format";
import { resolveAssetUrl } from "@/lib/assets";
import { PlaceholderImage } from "./PlaceholderImage";
import shared from "./shared.module.css";
import styles from "./NewsSection.module.css";

export function NewsSection({ news }: { news: News[] }) {
  return (
    <div id="actus" className={`${styles.section} ${shared.sectionPad}`}>
      <div className={shared.container}>
        <h2 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
          Actualités
        </h2>

        {news.length === 0 ? (
          <p className={shared.empty}>Aucune actualité publiée pour le moment.</p>
        ) : (
          <div className={styles.grid}>
            {news.map((item) => {
              const date = item.publishedAt ?? item.createdAt;
              return (
                <article key={item.id} className={styles.item}>
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
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
