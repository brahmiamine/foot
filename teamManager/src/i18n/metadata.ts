import type { Metadata } from "next";
import type { TranslationKey } from "./dictionaries";

type Translator = (key: TranslationKey, values?: Record<string, string | number>) => string;
type MetadataBranding = { name: string; faviconUrl?: string | null } | null;

export function createAppMetadata(branding: MetadataBranding, t: Translator): Metadata {
  return {
    title: branding ? `${branding.name} — TeamManager` : "TeamManager",
    description: branding
      ? t("metadata.description.club", { team: branding.name })
      : t("metadata.description.default"),
    manifest: "/manifest.webmanifest",
    icons: {
      icon: branding?.faviconUrl || "/images/favicon.png",
      apple: "/icons/apple-touch-icon.png",
    },
  };
}
