import { cookies } from "next/headers";
import { dictionaries } from "./i18n/dictionaries";

export type Locale = "fr" | "ar";
export const LOCALE_COOKIE = "referee_hub_language";

export async function getLocale(): Promise<Locale> {
  return (await cookies()).get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "fr";
}

export function localize(locale: Locale, fr: string | null | undefined, ar?: string | null): string {
  if (locale === "ar" && ar) return ar;
  return fr || "—";
}

export function navTranslations(locale: Locale) {
  const values = dictionaries[locale];
  return {
    dashboard: values["navigation.dashboard"],
    assignments: values["navigation.assignments"],
    reports: values["navigation.reports"],
    availability: values["navigation.availability"],
    history: values["navigation.history"],
    profile: values["navigation.profile"],
    logout: values["navigation.logout"],
    portal: values["navigation.portal"],
    privateSpace: values["navigation.privateSpace"],
    upcoming: values["assignments.upcoming"],
    past: values["assignments.past"],
    revoked: values["assignments.revoked"],
  };
}
