import Image from "next/image";
import shared from "./shared.module.css";
import styles from "./Hero.module.css";
import { getTranslator } from "@/i18n/server";

export async function Hero() {
  const { t } = await getTranslator();
  return (
    <div className={styles.hero}>
      <Image src="/images/stade-hero.jpg" alt="" fill priority sizes="100vw" className={styles.bgPhoto} />
      <div className={styles.overlay} />
      <div className={styles.stripes} />
      <div className={styles.inner}>
        <div className={styles.eyebrow}>{t("home.heroEyebrow")}</div>
        <h1 className={styles.title}>
          {t("home.heroTitle")}
        </h1>
        <p className={styles.lead}>
          {t("home.heroSubtitle")}
        </p>
        <div className={styles.actions}>
          <a href="#ticketing" className={shared.btnPrimary} style={{ padding: "16px 32px", fontSize: 16 }}>
            {t("home.buyTicket")}
          </a>
          <a href="#effectif" className={shared.btnOutline} style={{ padding: "14px 32px", fontSize: 16 }}>
            {t("home.viewSquad")}
          </a>
        </div>
      </div>
    </div>
  );
}
