import Link from "next/link";

/** Accès à /parametres (notifications push) depuis n'importe quel écran — voir matchsheet.css pour le positionnement. */
export function SettingsLink() {
  return (
    <Link href="/parametres" className="matchsheet-settings-link" aria-label="Réglages">
      <i className="bx bx-bell" aria-hidden="true" />
    </Link>
  );
}
