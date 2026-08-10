import type { Metadata } from "next";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Olympique de Béja",
  description:
    "Site officiel de l'Olympique de Béja — Les Cigognes de Béja, club omnisports tunisien fondé en 1929. Calendrier, résultats, actualités, effectif et classement.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${barlowCondensed.variable} ${sourceSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
