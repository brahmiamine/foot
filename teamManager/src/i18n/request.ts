import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, localeCookieName } from "./config";

/**
 * Locale is never part of the URL (no `/[locale]/...` segments — every
 * existing route, admin or public, stays exactly as-is). Instead it is
 * read server-side from a `foot_locale` cookie, defaulting to French.
 * The locale switcher (in AdminHeader / the public footer) just writes
 * that cookie and refreshes the page.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
