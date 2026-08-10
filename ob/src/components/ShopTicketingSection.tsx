import Link from "next/link";
import type { Product } from "@/entities/Product";
import { formatPriceTnd } from "@/lib/format";
import shared from "./shared.module.css";
import styles from "./ShopTicketingSection.module.css";

export function ShopTicketingSection({ products }: { products: Product[] }) {
  return (
    <div id="billetterie" className={shared.sectionPad}>
      <div className={shared.container}>
        <div className={styles.grid}>
          <div className={`${styles.panel} ${styles.tickets}`}>
            <div className={styles.title}>Billetterie</div>
            <p className={styles.ticketsText}>
              Réservez votre place au Stade Boujemaa Kmiti et venez encourager les Cigognes à domicile.
            </p>
            <Link href="/#contact" className={shared.btnDark} style={{ alignSelf: "flex-start", marginTop: 8 }}>
              Contacter le club
            </Link>
          </div>

          <div className={`${shared.card} ${styles.panel}`}>
            <div className={styles.title}>Boutique officielle</div>
            {products.length > 0 ? (
              <>
                <p className={styles.shopText}>Produits disponibles à la boutique du club :</p>
                <div className={styles.products}>
                  {products.map((product) => (
                    <div key={product.id}>
                      {product.nameFr} — {formatPriceTnd(product.price)}
                    </div>
                  ))}
                </div>
                <Link href="/boutique" className={shared.btnLight} style={{ alignSelf: "flex-start", marginTop: 8 }}>
                  Voir la boutique
                </Link>
              </>
            ) : (
              <>
                <p className={styles.shopText}>Boutique en cours de préparation, revenez bientôt.</p>
                <Link href="/#contact" className={shared.btnLight} style={{ alignSelf: "flex-start", marginTop: 8 }}>
                  Contacter le club
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
