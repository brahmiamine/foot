import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "@/assets/scss/skote-theme.scss";
import "../../../packages/design-tokens/src/internal-admin.css";
import "./match-operations.css";
import { MatchService } from "@/services/MatchService";
import { MatchesBottomBar } from "@/components/MatchesBottomBar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { translate } from "@/lib/i18n/dictionaries";
import { directionFor, LANGUAGE_COOKIE, resolveLanguage } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const lang = resolveLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  return {
    title: translate(lang, "metadata.title"),
    description: translate(lang, "metadata.description"),
    applicationName: translate(lang, "metadata.applicationName"),
    robots: { index: false, follow: false },
    manifest: "/manifest.json",
    icons: { apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1f2530",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = resolveLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
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
    <html lang={lang} dir={directionFor(lang)} suppressHydrationWarning>
      <body data-layout-mode="light" className="match-operations-app">
        <LanguageProvider initialLang={lang}>
          <div className="match-operations-shell">
            <LanguageToggle />
            <main className="match-operations-main">{children}</main>
            <MatchesBottomBar matches={matchOptions} />
          </div>
        </LanguageProvider>

        <ServiceWorkerRegistration />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
