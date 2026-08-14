import type { MetadataRoute } from "next";
import { getTranslator } from "@/i18n/server";

/**
 * Manifest PWA — voir avancement.md, "club-ob" : pas de PWA installable. Le
 * service worker (public/sw.js) n'existait jusqu'ici que pour le Web Push
 * (voir ServiceWorkerRegistration.tsx) ; sans manifest, le navigateur ne
 * proposait jamais l'installation. Icônes générées depuis
 * public/images/crest.png (voir public/icons/) sur fond `--ob-red`
 * (#c8102e, globals.css).
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { locale, t } = await getTranslator();
  return {
    name: "Olympique de Béja",
    short_name: "OB",
    description: t("metadata.siteDescription"),
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c8102e",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["sports", "football"],
    lang: locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    scope: "/",
    prefer_related_applications: false,
  };
}
