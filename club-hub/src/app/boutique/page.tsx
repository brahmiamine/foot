import Link from "next/link";
import { listTeamsWithActiveProducts } from "@/services/ShopOrderService";

export const dynamic = "force-dynamic";

/**
 * Annuaire public de la boutique (avancement.md, rang 1 : "boutique client
 * complète avec paiement réel") — un club par carte, vers /boutique/[teamId]
 * pour le catalogue + panier + paiement de ce club. Un panier ne mélange
 * jamais deux clubs (voir ShopOrderService.createOrder).
 */
export default async function BoutiquePage() {
  const teams = await listTeamsWithActiveProducts();

  return (
    <div className="container py-5" style={{ maxWidth: "720px" }}>
      <h1 className="h3 mb-4">Boutique</h1>
      {teams.length === 0 ? (
        <p className="text-muted">Aucun article en vente pour le moment.</p>
      ) : (
        <div className="list-group">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/boutique/${team.id}`}
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              {team.nom}
              <i className="fas fa-chevron-right text-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
