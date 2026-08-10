"use server";

import { cookies } from "next/headers";
import { COOKIE_NAME, defaultLocale, isLocale, type Locale } from "./config";

/**
 * Langue courante du kiosque, lue depuis le cookie `foot_locale` (pas de
 * routing localisé — les URLs de feuille de match, ex. /[matchId]/live,
 * restent identiques quelle que soit la langue).
 */
export async function getUserLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Change la langue du kiosque. Appelée en Server Action depuis le bouton de
 * bascule FR/AR — le round-trip serveur revalide automatiquement l'arbre de
 * Server Components (dont le RootLayout, qui relit ce cookie).
 */
export async function setUserLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
