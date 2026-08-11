import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seller Portal — Olympique de Béja",
  description: "Portail vendeur de la marketplace Olympique de Béja",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
