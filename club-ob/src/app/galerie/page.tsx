import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { assertSectionEnabled } from "@/lib/publicContentPolicy";
import { PublicGalleryService } from "@/services/PublicGalleryService";
import { resolveAssetUrl } from "@/lib/assets";
import { PageChrome } from "@/components/PageChrome";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import shared from "@/components/shared.module.css";
import styles from "./galerie.module.css";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.gallery");

export default async function GaleriePage() {
  const { locale, t } = await getTranslator();
  const team = await getObTeam();
  await assertSectionEnabled(team?.id, "GALLERY");
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
                <div className={styles.title}>{localized(locale, gallery.titleFr, gallery.titleAr)}</div>
                {gallery.photos.length === 0 ? (
                  <p className={shared.empty}>{t("gallery.emptyGallery")}</p>
                ) : (
                  <div className={styles.grid}>
                    {gallery.photos.map((photo) => (
                      <PlaceholderImage
                        key={photo.id}
                        src={resolveAssetUrl(photo.url)}
                        alt={localized(locale, photo.altFr, photo.altAr) ?? localized(locale, gallery.titleFr, gallery.titleAr)}
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
