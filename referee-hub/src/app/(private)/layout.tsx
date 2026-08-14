import { PortalShell } from "@/components/PortalShell";
import { getLocale, navTranslations } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const [session, locale] = await Promise.all([requireRequestSession(), getLocale()]);
  return (
    <PortalShell session={session} locale={locale} labels={navTranslations(locale)}>
      {children}
    </PortalShell>
  );
}
