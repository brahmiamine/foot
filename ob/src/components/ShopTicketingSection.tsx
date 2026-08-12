import Link from "next/link";
import type { Product } from "@/entities/Product";
import { formatPriceTnd } from "@/lib/format";
import shared from "./shared.module.css";
import styles from "./ShopTicketingSection.module.css";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export async function ShopTicketingSection({ products }: { products: Product[] }) {
  const { locale, t } = await getTranslator();
  return (
    <div id="billetterie" className={shared.sectionPad}>
      <div className={shared.container}>
        <div className={styles.grid}>
          <div className={`${styles.panel} ${styles.tickets}`}>
            <div className={styles.title}>{t("nav.tickets")}</div>
            <p className={styles.ticketsText}>
              {t("home.ticketText")}
            </p>
            <Link href="/#contact" className={shared.btnDark} style={{ alignSelf: "flex-start", marginTop: 8 }}>
              {t("common.contactClub")}
            </Link>
          </div>

          <div className={`${shared.card} ${styles.panel}`}>
            <div className={styles.title}>{t("home.shopOfficial")}</div>
            {products.length > 0 ? (
              <>
                <p className={styles.shopText}>{t("home.productsAvailable")}</p>
                <div className={styles.products}>
                  {products.map((product) => (
                    <div key={product.id}>
                      {localized(locale, product.nameFr, product.nameAr)} — {formatPriceTnd(product.price, locale)}
                    </div>
                  ))}
                </div>
                <Link href="/boutique" className={shared.btnLight} style={{ alignSelf: "flex-start", marginTop: 8 }}>
                  {t("home.viewShop")}
                </Link>
              </>
            ) : (
              <>
                <p className={styles.shopText}>{t("home.shopSoon")}</p>
                <Link href="/#contact" className={shared.btnLight} style={{ alignSelf: "flex-start", marginTop: 8 }}>
                  {t("common.contactClub")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
