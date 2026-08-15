import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildPlayerLoginUrlForPath } from "@/lib/ssoSession";
import { playerPortalService } from "@/services/PlayerPortalService";
import { getClubBranding } from "@/lib/clubBranding";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider } from "@/i18n/I18nProvider";
import { localeDirection } from "@/i18n/config";
import { getTranslator } from "@/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  const session = await auth();
  if (!session) return { title: t("app.name") };
  const branding = await getClubBranding(session.user.teamId);
  return { title: t("app.titleWithClub", { club: branding.name }), icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect(await buildPlayerLoginUrlForPath("/"));

  const [{ locale }, player, branding] = await Promise.all([
    getTranslator(),
    playerPortalService.getPlayer(session.user.playerId),
    getClubBranding(session.user.teamId),
  ]);
  if (!player) redirect(await buildPlayerLoginUrlForPath("/"));

  return (
    <html lang={locale} dir={localeDirection(locale)}>
      <body>
        <I18nProvider locale={locale}>
          <AppShell playerName={`${player.firstNameFr} ${player.lastNameFr}`} playerNumber={player.number} userName={session.user.name} clubBranding={branding}>
            {children}
          </AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
