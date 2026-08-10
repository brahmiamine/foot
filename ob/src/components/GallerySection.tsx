import type { GalleryPhoto } from "@/services/PublicGalleryService";
import { resolveAssetUrl } from "@/lib/assets";
import { PlaceholderImage } from "./PlaceholderImage";
import shared from "./shared.module.css";
import styles from "./GallerySection.module.css";

export function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div id="galerie" className={`${styles.section} ${shared.sectionPad}`}>
      <div className={shared.container}>
        <h2 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
          Galerie
        </h2>

        {photos.length === 0 ? (
          <p className={shared.empty}>Galerie photo à venir.</p>
        ) : (
          <div className={styles.grid}>
            {photos.map((photo, index) => (
              <PlaceholderImage
                key={photo.id}
                src={resolveAssetUrl(photo.url)}
                alt={photo.alt ?? "Photo du club"}
                label="Photo à venir"
                className={`${styles.item} ${index === 0 ? styles.big : ""}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
