import type { Metadata } from "next";
import "./globals.css";
import "@/assets/scss/skote-theme.scss";
import "./matchsheet.css";
import { MatchService } from "@/services/MatchService";
import { MatchesBottomBar } from "@/components/MatchesBottomBar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { NotificationBell } from "@/components/NotificationBell";
import { getSsoUserFromHeaders } from "@/lib/ssoUser";

export const metadata: Metadata = {
  title: "FTF — Feuille de Match Électronique",
  description: "Fédération Tunisienne de Football — feuille de match électronique : composition, événements et signatures.",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "FTF Matchsheet",
    "mobile-web-app-capable": "yes",
    "theme-color": "#ce1126",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const matchService = new MatchService();
  const matches = await matchService.findRecent();
  const ssoUser = await getSsoUserFromHeaders();

  const matchOptions = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam?.nom ?? "?",
    awayTeam: m.awayTeam?.nom ?? "?",
    date: m.date ? m.date.toISOString() : null,
    status: m.status,
  }));

  return (
    <html lang="fr" suppressHydrationWarning>
      <body data-layout-mode="light" className="matchsheet-app">
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
        <LanguageProvider>
          <div className="matchsheet-shell">
            {ssoUser && <NotificationBell />}
            <LanguageToggle />
            <main className="matchsheet-main">{children}</main>
            <MatchesBottomBar matches={matchOptions} />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
