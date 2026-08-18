import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { assertSectionEnabled } from "@/lib/publicContentPolicy";
import { PublicShopService } from "@/services/PublicShopService";
import { resolveAssetUrl } from "@/lib/assets";
import { formatPriceTnd } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import shared from "@/components/shared.module.css";
import styles from "./boutique.module.css";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.shop");

export default async function BoutiquePage() {
  const { locale, t } = await getTranslator();
  const team = await getObTeam();
  await assertSectionEnabled(team?.id, "SHOP");
  const products = team ? await new PublicShopService().getAllActive(team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            {t("shop.title")}
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            {t("shop.subtitle")}
          </p>

          {products.length === 0 ? (
            <p className={shared.empty}>{t("home.shopSoon")}</p>
          ) : (
            <div className={styles.grid}>
              {products.map((product) => (
                <div key={product.id} className={`${shared.card} ${styles.card}`}>
                  <PlaceholderImage
                    src={resolveAssetUrl(product.imageUrl)}
                    alt={localized(locale, product.nameFr, product.nameAr)}
                    label={t("common.photoSoon")}
                    className={styles.image}
                  />
                  <div className={styles.body}>
                    <div className={styles.name}>{localized(locale, product.nameFr, product.nameAr)}</div>
                    <div className={styles.price}>{formatPriceTnd(product.price, locale)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
