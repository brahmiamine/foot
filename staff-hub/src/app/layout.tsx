import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess } from "@/lib/access";
import { toClientAccess } from "@/lib/access-client";
import { buildStaffLoginUrlForPath } from "@/lib/ssoSession";
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
  if (!session) redirect(await buildStaffLoginUrlForPath("/"));
  const [{ locale }, access, branding] = await Promise.all([getTranslator(), getUserAccess(), getClubBranding(session.user.teamId)]);
  return <html lang={locale} dir={localeDirection(locale)}><body><I18nProvider locale={locale}><AppShell userName={session.user.name} role={session.user.role} clubBranding={branding} access={toClientAccess(access)}>{children}</AppShell></I18nProvider></body></html>;
}
