import Link from "next/link";
import type { News } from "@/entities/News";
import { NewsCard } from "./NewsCard";
import shared from "./shared.module.css";
import styles from "./NewsSection.module.css";

export function NewsSection({ news }: { news: News[] }) {
  return (
    <div id="actus" className={`${styles.section} ${shared.sectionPad}`}>
      <div className={shared.container}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>Actualités</h2>
          <Link href="/actualites" className={shared.sectionSubtitle}>
            Toutes les actualités →
          </Link>
        </div>

        {news.length === 0 ? (
          <p className={shared.empty}>Aucune actualité publiée pour le moment.</p>
        ) : (
          <div className={styles.grid}>
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
