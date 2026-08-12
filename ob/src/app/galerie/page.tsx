import { getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { PublicGalleryService } from "@/services/PublicGalleryService";
import { resolveAssetUrl } from "@/lib/assets";
import { PageChrome } from "@/components/PageChrome";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import shared from "@/components/shared.module.css";
import styles from "./galerie.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Galerie — Olympique de Béja",
};

export default async function GaleriePage() {
  const { t } = await getTranslator();
  const team = await getObTeam();
  const galleries = team ? await new PublicGalleryService().getAllGalleries(team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            {t("gallery.title")}
          </h1>

          {galleries.length === 0 ? (
            <p className={shared.empty}>{t("home.gallerySoon")}</p>
          ) : (
            galleries.map((gallery) => (
              <div key={gallery.id} className={styles.gallery}>
                <div className={styles.title}>{gallery.title}</div>
                {gallery.photos.length === 0 ? (
                  <p className={shared.empty}>{t("gallery.emptyGallery")}</p>
                ) : (
                  <div className={styles.grid}>
                    {gallery.photos.map((photo) => (
                      <PlaceholderImage
                        key={photo.id}
                        src={resolveAssetUrl(photo.url)}
                        alt={photo.alt ?? gallery.title}
                        label={t("common.photoSoon")}
                        className={styles.item}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PageChrome>
  );
}
