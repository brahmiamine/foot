import { notFound } from "next/navigation";
import { getObTeam } from "@/lib/ob-team";
import { PublicStadiumService } from "@/services/PublicStadiumService";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { getLocale } from "@/i18n/server";
import { localized } from "@/i18n/localized";

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

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav teamName={teamName} />
      <main>{children}</main>
      <Footer teamId={team.id} teamName={teamName} stadium={homeStadium} />
    </div>
  );
}
