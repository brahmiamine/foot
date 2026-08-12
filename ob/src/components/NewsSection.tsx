import Link from "next/link";
import type { News } from "@/entities/News";
import { NewsCard } from "./NewsCard";
import shared from "./shared.module.css";
import { getTranslator } from "@/i18n/server";
import styles from "./NewsSection.module.css";

export async function NewsSection({ news }: { news: News[] }) {
  const { t } = await getTranslator();
  return (
    <div id="actus" className={`${styles.section} ${shared.sectionPad}`}>
      <div className={shared.container}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>{t("home.news")}</h2>
          <Link href="/actualites" className={shared.sectionSubtitle}>
            {t("news.all")}
          </Link>
        </div>

        {news.length === 0 ? (
          <p className={shared.empty}>{t("home.noNews")}</p>
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
