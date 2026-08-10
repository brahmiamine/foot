import shared from "./shared.module.css";
import styles from "./HistorySection.module.css";

/**
 * Contenu éditorial statique : il n'existe pas (encore) de table "histoire
 * du club" dans le schéma partagé, contrairement aux matchs/joueurs/actus.
 * Repris tel quel des faits publics vérifiés lors de la conception du
 * design (fondation, palmarès) — à faire évoluer en dur ici tant qu'aucune
 * table CMS dédiée n'existe.
 */
const TIMELINE: { year: string; text: string }[] = [
  {
    year: "1929",
    text: "Fondation de l'Olympique de Béja par Mahmoud M'nakbi, Abdelhakim Chaouachi, Abderrahman Saïed et Mohamed Ben Mbarek.",
  },
  {
    year: "1985",
    text: "Première montée en division nationale (Ligue 1) après des années de compétition régionale.",
  },
  {
    year: "1993",
    text: "Première Coupe de Tunisie remportée face à l'Avenir sportif de La Marsa.",
  },
  {
    year: "1995",
    text: "Le club décroche la Supercoupe de Tunisie face au Club Sportif Sfaxien.",
  },
  {
    year: "2010",
    text: "Deuxième Coupe de Tunisie, avec un but décisif de Mehdi Harb en finale.",
  },
  {
    year: "2023",
    text: "Triplé historique : Coupe de Tunisie et Supercoupe de Tunisie remportées la même année.",
  },
];

export function HistorySection() {
  return (
    <div id="histoire" className={shared.sectionPad}>
      <div className={shared.container}>
        <h2 className={shared.sectionTitle} style={{ marginBottom: 36 }}>
          Histoire du club
        </h2>
        <div className={styles.list}>
          {TIMELINE.map((entry) => (
            <div key={entry.year} className={styles.row}>
              <div className={styles.year}>{entry.year}</div>
              <div className={styles.text}>{entry.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
