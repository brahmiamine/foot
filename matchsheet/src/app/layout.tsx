import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/assets/scss/skote-theme.scss";
import "./matchsheet.css";
import { MatchService } from "@/services/MatchService";
import { MatchesBottomBar } from "@/components/MatchesBottomBar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "FTF — Feuille de Match Électronique",
  description: "Fédération Tunisienne de Football — feuille de match électronique : composition, événements et signatures.",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f2530",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const matchService = new MatchService();
  const matches = await matchService.findRecent();

  const matchOptions = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam?.nom ?? "?",
    awayTeam: m.awayTeam?.nom ?? "?",
    homeTeamAr: m.homeTeam?.nomAr ?? null,
    awayTeamAr: m.awayTeam?.nomAr ?? null,
    date: m.date ? m.date.toISOString() : null,
    status: m.status,
  }));

  return (
    <html lang="fr" suppressHydrationWarning>
      <body data-layout-mode="light" className="matchsheet-app">
        <LanguageProvider>
          <div className="matchsheet-shell">
            <LanguageToggle />
            <main className="matchsheet-main">{children}</main>
            <MatchesBottomBar matches={matchOptions} />
          </div>
        </LanguageProvider>

        <ServiceWorkerRegistration />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
