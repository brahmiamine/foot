import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

/**
 * Billetterie générique multi-clubs : pas de branding de club ici (aucun
 * club "propriétaire" de cette app) — voir README racine, section
 * « Classification des projets ». Le club apparaît uniquement dans le
 * contenu (nom des équipes d'un match), jamais dans l'identité visuelle de
 * l'app elle-même.
 */
export const metadata: Metadata = {
  title: "Billetterie",
  description: "Billets pour les matchs de tous les clubs de la plateforme.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="tk-header">
          <Link href="/" style={{ fontWeight: 700, textDecoration: "none" }}>
            🎟️ Billetterie
          </Link>
          <Link href="/mes-billets" style={{ fontSize: "0.85rem", textDecoration: "none", color: "var(--tk-text-muted)" }}>
            Mes billets
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
