import { getObTeam } from "@/lib/ob-team";
import { PublicShopService } from "@/services/PublicShopService";
import { resolveAssetUrl } from "@/lib/assets";
import { formatPriceTnd } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import shared from "@/components/shared.module.css";
import styles from "./boutique.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Boutique — Olympique de Béja",
};

export default async function BoutiquePage() {
  const team = await getObTeam();
  const products = team ? await new PublicShopService().getAllActive(team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Boutique officielle
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            Catalogue du club — commande directement auprès du club, pas de paiement en ligne pour le moment.
          </p>

          {products.length === 0 ? (
            <p className={shared.empty}>Boutique en cours de préparation, revenez bientôt.</p>
          ) : (
            <div className={styles.grid}>
              {products.map((product) => (
                <div key={product.id} className={`${shared.card} ${styles.card}`}>
                  <PlaceholderImage
                    src={resolveAssetUrl(product.imageUrl)}
                    alt={product.nameFr}
                    label="Photo à venir"
                    className={styles.image}
                  />
                  <div className={styles.body}>
                    <div className={styles.name}>{product.nameFr}</div>
                    <div className={styles.price}>{formatPriceTnd(product.price)}</div>
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
