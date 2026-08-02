import type { Metadata } from "next";
import "./globals.css";
import "@/assets/scss/skote-theme.scss";

export const metadata: Metadata = {
  title: "SuperAdmin",
  description: "Outil interne de gestion du référentiel (fédérations, ligues, équipes, arbitres, matchs) et des comptes clubs.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body data-sidebar="dark" data-sidebar-size="lg" data-layout="vertical" data-layout-mode="light">
        {children}
      </body>
    </html>
  );
}
