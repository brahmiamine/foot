import type { MetadataRoute } from "next";
import { getSsoSession } from "@/lib/ssoSession";
import { getClubBranding } from "@/lib/clubBranding";

/**
 * Manifest PWA résolu dynamiquement par club connecté (nom/description/
 * couleurs) — remplace l'ancien public/manifest.json hardcodé à un seul
 * club. Voir README racine, section « Classification des projets ». Les
 * icônes restent des assets statiques par défaut : les personnaliser par
 * club nécessiterait de valider des images fournies par chaque club
 * (formats/tailles requis pour rester installable), non fait ici — voir
 * README, section « Points nécessitant une intervention manuelle ».
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const session = await getSsoSession();
  const branding = session?.teamId ? await getClubBranding(session.teamId) : null;

  return {
    name: branding ? `TeamManager — ${branding.name}` : "TeamManager",
    short_name: "TeamManager",
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
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["sports", "football", "productivity"],
    lang: "fr",
    dir: "ltr",
    scope: "/",
    prefer_related_applications: false,
  };
}
