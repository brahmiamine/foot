import { notFound } from "next/navigation";
import { getObTeam } from "@/lib/ob-team";
import { PublicStadiumService } from "@/services/PublicStadiumService";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

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

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav teamName={team.nom} logoUrl={team.logoUrl} />
      <main>{children}</main>
      <Footer teamId={team.id} teamName={team.nom} logoUrl={team.logoUrl} stadium={homeStadium} />
    </div>
  );
}
