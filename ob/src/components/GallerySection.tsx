import Link from "next/link";
import type { GalleryPhoto } from "@/services/PublicGalleryService";
import { resolveAssetUrl } from "@/lib/assets";
import { PlaceholderImage } from "./PlaceholderImage";
import shared from "./shared.module.css";
import { getTranslator } from "@/i18n/server";
import styles from "./GallerySection.module.css";

export async function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const { t } = await getTranslator();
  return (
    <div id="galerie" className={`${styles.section} ${shared.sectionPad}`}>
      <div className={shared.container}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>{t("home.gallery")}</h2>
          <Link href="/galerie" className={shared.sectionSubtitle}>
            {t("gallery.title")} →
          </Link>
        </div>

        {photos.length === 0 ? (
          <p className={shared.empty}>{t("home.gallerySoon")}</p>
        ) : (
          <div className={styles.grid}>
            {photos.map((photo, index) => (
              <PlaceholderImage
                key={photo.id}
                src={resolveAssetUrl(photo.url)}
                alt={photo.alt ?? t("home.clubPhoto")}
                label={t("common.photoSoon")}
                className={`${styles.item} ${index === 0 ? styles.big : ""}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
