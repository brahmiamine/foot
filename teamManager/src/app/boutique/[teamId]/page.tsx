import { notFound } from "next/navigation";
import { TeamService } from "@/services/TeamService";
import { ProductService } from "@/services/ProductService";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { PurchaseForm } from "./PurchaseForm";

export const dynamic = "force-dynamic";

/**
 * Boutique publique d'un club — checkout/paiement réel via payment-api (voir
 * src/services/OrderService.ts). Accessible sans authentification pour la
 * consultation (comme /devenir-sponsor/[teamId], /recrutement/[teamId]...),
 * mais l'achat nécessite un compte `MEMBER` (espace supporter `sso`) : les
 * visiteurs non connectés voient un lien de connexion à la place du
 * formulaire d'achat, sur le même modèle que billetterie/src/app/match/[id].
 */
export default async function BoutiquePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  const teamService = new TeamService();
  const team = await teamService.findById(teamId);
  if (!team) notFound();

  const productService = new ProductService();
  const products = await productService.findActiveByTeam(teamId);

  const session = await getSsoSession();
  const loginUrl = !session || session.role !== "MEMBER" ? await buildMemberLoginUrlForPath(`/boutique/${teamId}`) : null;

  return (
    <div className="container py-5" style={{ maxWidth: "960px" }}>
      <div className="text-center mb-4">
        {team.logoUrl && (
          <ImageWithFallback
            src={team.logoUrl}
            alt={team.nom}
            style={{ height: "80px", objectFit: "contain" }}
            className="mb-3"
            fallbackIcon="fas fa-shield-alt fa-2x"
          />
        )}
        <h1 className="h3 mb-2">Boutique {team.nom}</h1>
        <p className="text-muted mb-0">Articles officiels du club.</p>
      </div>

      {products.length === 0 ? (
        <p className="text-muted text-center">Aucun article disponible pour le moment.</p>
      ) : (
        <div className="row g-3">
          {products.map((product) => (
            <div key={product.id} className="col-md-4">
              <div className="card h-100 shadow-sm">
                <ImageWithFallback
                  src={product.imageUrl ?? undefined}
                  alt={product.nameFr}
                  className="card-img-top"
                  style={{ height: "180px", objectFit: "cover" }}
                  fallbackIcon="fas fa-tshirt fa-2x"
                />
                <div className="card-body d-flex flex-column">
                  <h2 className="h6 mb-1">{product.nameFr}</h2>
                  {product.category && <div className="text-muted small mb-2">{product.category.nameFr}</div>}
                  {product.descriptionFr && <p className="small text-muted mb-2">{product.descriptionFr}</p>}
                  <div className="mt-auto">
                    <div className="fw-semibold mb-1">{Number(product.price).toFixed(3)} DT</div>
                    <div className="small text-muted mb-2">
                      {product.stock > 0 ? `${product.stock} en stock` : "Rupture de stock"}
                    </div>
                    {loginUrl ? (
                      <a href={loginUrl} className="btn btn-outline-primary btn-sm">
                        Se connecter pour acheter
                      </a>
                    ) : (
                      <PurchaseForm productId={product.id} price={product.price} stock={product.stock} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
