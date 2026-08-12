import { notFound } from "next/navigation";
import { TeamService } from "@/services/TeamService";
import { listActiveProductsForTeam } from "@/services/ShopOrderService";
import { ShopCatalog } from "./ShopCatalog";

export const dynamic = "force-dynamic";

/** Page publique — catalogue + panier + paiement d'un club : /boutique/[teamId]. */
export default async function BoutiqueTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = await new TeamService().findById(teamId);
  if (!team) {
    notFound();
  }

  const products = await listActiveProductsForTeam(teamId);

  return (
    <div className="container py-5" style={{ maxWidth: "960px" }}>
      <h1 className="h3 mb-4">Boutique {team.nom}</h1>
      <ShopCatalog teamId={teamId} products={products} />
    </div>
  );
}
