import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Billetterie",
  description: "Achetez vos billets pour les matchs de votre club",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
