import shared from "./shared.module.css";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.stripes} />
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Fondé en 1929 · Béja, Tunisie</div>
        <h1 className={styles.title}>
          Les Cigognes
          <br />
          de Béja
        </h1>
        <p className={styles.lead}>
          Club omnisports tunisien fondé en 1929, l&apos;Olympique de Béja porte les couleurs rouge et blanc du
          Nord-Ouest tunisien en Ligue Professionnelle 1.
        </p>
        <div className={styles.actions}>
          <a href="#billetterie" className={shared.btnPrimary} style={{ padding: "16px 32px", fontSize: 16 }}>
            Acheter un billet
          </a>
          <a href="#effectif" className={shared.btnOutline} style={{ padding: "14px 32px", fontSize: 16 }}>
            Voir l&apos;effectif
          </a>
        </div>
      </div>
    </div>
  );
}
