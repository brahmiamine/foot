import type { Metadata } from "next";
import "./globals.css";
import "@/assets/scss/skote-theme.scss";
import "./matchsheet.css";
import { MatchService } from "@/services/MatchService";
import { MatchesBottomBar } from "@/components/MatchesBottomBar";

export const metadata: Metadata = {
  title: "Feuille de match",
  description: "Feuille de match électronique — composition, événements et signatures.",
  robots: { index: false, follow: false },
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
    date: m.date ? m.date.toISOString() : null,
    status: m.status,
  }));

  return (
    <html lang="fr" suppressHydrationWarning>
      <body data-layout-mode="light" className="matchsheet-app">
        <div className="matchsheet-shell">
          <main className="matchsheet-main">{children}</main>
          <MatchesBottomBar matches={matchOptions} />
        </div>
      </body>
    </html>
  );
}
