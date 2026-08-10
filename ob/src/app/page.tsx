import { notFound } from "next/navigation";
import { getObTeam } from "@/lib/ob-team";
import { PublicMatchService } from "@/services/PublicMatchService";
import { PublicNewsService } from "@/services/PublicNewsService";
import { PublicPlayerService } from "@/services/PublicPlayerService";
import { PublicStandingsService } from "@/services/PublicStandingsService";
import { PublicGalleryService } from "@/services/PublicGalleryService";
import { PublicShopService } from "@/services/PublicShopService";
import { PublicStadiumService } from "@/services/PublicStadiumService";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { NextMatchBar } from "@/components/NextMatchBar";
import { RecentResults } from "@/components/RecentResults";
import { NewsSection } from "@/components/NewsSection";
import { SquadSection } from "@/components/SquadSection";
import { StandingsSection } from "@/components/StandingsSection";
import { HistorySection } from "@/components/HistorySection";
import { GallerySection } from "@/components/GallerySection";
import { ShopTicketingSection } from "@/components/ShopTicketingSection";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const team = await getObTeam();
  if (!team) {
    notFound();
  }

  const matchService = new PublicMatchService();
  const stadiumService = new PublicStadiumService();

  const [nextMatch, recentResults, news, squad, standings, photos, products, homeStadium] = await Promise.all([
    matchService.getNextMatch(team.id),
    matchService.getRecentResults(team.id),
    new PublicNewsService().getLatest(team.id),
    new PublicPlayerService().getSquad(team.id),
    new PublicStandingsService().getStandings(team),
    new PublicGalleryService().getPhotos(team.id),
    new PublicShopService().getActiveProducts(team.id),
    stadiumService.getHomeStadium(team.id),
  ]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav teamName={team.nom} logoUrl={team.logoUrl} />
      <Hero />
      <NextMatchBar match={nextMatch} obTeamId={team.id} homeStadium={homeStadium} />
      <RecentResults results={recentResults} obTeamId={team.id} />
      <NewsSection news={news} />
      <SquadSection groups={squad} />
      <StandingsSection standings={standings} obTeamId={team.id} federationName={team.federation?.nom} />
      <HistorySection />
      <GallerySection photos={photos} />
      <ShopTicketingSection products={products} />
      <Footer teamId={team.id} teamName={team.nom} logoUrl={team.logoUrl} stadium={homeStadium} />
    </div>
  );
}
