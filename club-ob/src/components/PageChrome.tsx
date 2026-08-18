import { notFound } from "next/navigation";
import { getObTeam } from "@/lib/ob-team";
import { PublicStadiumService } from "@/services/PublicStadiumService";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { getLocale } from "@/i18n/server";
import { localized } from "@/i18n/localized";
import { resolvePublicContentPolicy } from "@/lib/publicContentPolicy";

const BANNER_COLORS: Record<"INFO" | "WARNING" | "CRITICAL", string> = {
  INFO: "#1d4ed8",
  WARNING: "#b45309",
  CRITICAL: "#b91c1c",
};

/**
 * Enveloppe Nav/Footer partagée par les pages secondaires (actualités,
 * calendrier, galerie, boutique). La page d'accueil ne l'utilise pas : elle
 * a déjà besoin de `team` pour ses propres sections et fait son propre
 * Promise.all, donc dupliquer l'appel ici n'apporterait rien.
 */
export async function PageChrome({ children }: { children: React.ReactNode }) {
  const team = await getObTeam();
  if (!team) {
    notFound();
  }

  const homeStadium = await new PublicStadiumService().getHomeStadium(team.id);
  const locale = await getLocale();
  const teamName = localized(locale, team.nom, team.nomAr);
  const policy = await resolvePublicContentPolicy(team.id);
  const banner = policy?.emergencyBanner;
  const bannerMessage = banner?.enabled
    ? locale === "ar"
      ? (banner.messageAr ?? banner.messageFr)
      : (banner.messageFr ?? banner.messageAr)
    : null;

  return (
    <div style={{ minHeight: "100vh" }}>
      {bannerMessage && (
        <div
          role="alert"
          style={{
            background: BANNER_COLORS[banner?.severity ?? "INFO"] ?? BANNER_COLORS.INFO,
            color: "#fff",
            padding: "10px 16px",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {bannerMessage}
        </div>
      )}
      <Nav teamName={teamName} />
      <main>{children}</main>
      <Footer teamId={team.id} teamName={teamName} stadium={homeStadium} />
    </div>
  );
}
