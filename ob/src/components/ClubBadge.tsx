import styles from "./ClubBadge.module.css";

/**
 * Écusson officiel du club, bundlé avec le site (`public/images/crest.png`).
 * `teams.logo_url` (base partagée) pointe actuellement vers une URL tierce
 * cassée, pas l'écusson officiel — on ne s'y fie donc pas ici ; la taille se
 * pilote via `className` (propre à chaque emplacement) plutôt qu'une prop
 * `size` figée, pour rester réactif en media queries.
 */
export function ClubBadge({ teamName, className }: { teamName: string; className?: string }) {
  return (
    <div className={`${styles.badge} ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- petit badge, pas besoin de next/image */}
      <img src="/images/crest.png" alt={teamName} />
    </div>
  );
}
