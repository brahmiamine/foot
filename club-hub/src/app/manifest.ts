import type { MetadataRoute } from "next";
import { getSsoSession } from "@/lib/ssoSession";
import { getClubBranding } from "@/lib/clubBranding";

/**
 * Manifest PWA résolu dynamiquement par club connecté (nom/description/
 * couleurs/icônes) — remplace l'ancien public/manifest.json hardcodé à un
 * seul club. Voir README racine, section « Classification des projets ».
 * Les icônes personnalisées (TeamBranding.icon192Url/icon512Url, voir
 * federation-hub/TeamBrandingPanel) sont fournies par le club sous forme d'URL
 * déjà hébergée (PNG 192x192/512x512 attendus, non revalidé côté serveur —
 * un club qui fournit une image invalide casse seulement son propre
 * manifest) ; à défaut, on retombe sur les icônes statiques par défaut.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const session = await getSsoSession();
  const branding = session?.teamId ? await getClubBranding(session.teamId) : null;

  const icon192 = branding?.icon192Url || "/icons/icon-192x192.png";
  const icon512 = branding?.icon512Url || "/icons/icon-512x512.png";

  return {
    name: branding ? `Club Hub — ${branding.name}` : "Club Hub",
    short_name: "Club Hub",
    description: branding
      ? `Gestion du club ${branding.name} : effectif, convocations, discipline, actualités, boutique et sponsors.`
      : "Gestion de club : effectif, convocations, discipline, actualités, boutique et sponsors.",
    start_url: "/admin",
    id: "/admin",
    display: "standalone",
    background_color: branding?.secondaryColor || "#0d0d0d",
    theme_color: branding?.primaryColor || "#c8102e",
    orientation: "portrait-primary",
    icons: [
      { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["sports", "football", "productivity"],
    lang: "fr",
    dir: "ltr",
    scope: "/",
    prefer_related_applications: false,
  };
}
