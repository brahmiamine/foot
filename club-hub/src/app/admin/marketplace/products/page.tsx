import { redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { listCategoriesForClub, listModerationProducts, listSellersForClub } from "@/lib/marketplaceApiClient";
import { ModerationTable } from "./ModerationTable";

export const dynamic = "force-dynamic";

const ALL_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"];

/**
 * Modération des produits marketplace soumis par les vendeurs (US-07 à
 * US-10). Réservé aux comptes du club ayant `marketplace.moderate` — voir
 * src/lib/permissions.ts. Toute la donnée vient désormais de marketplace
 * en HTTP (voir src/lib/marketplaceApiClient.ts, TS-04) — club-hub
 * n'accède plus directement à `sp_products`/`sp_sellers`. Republication d'un
 * produit corrigé (US-11) se fait entièrement côté seller-portal (REJECTED ->
 * DRAFT -> SUBMITTED), rien à faire ici.
 */
export default async function MarketplaceProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sellerId?: string; status?: string; categoryId?: string; name?: string; from?: string; to?: string }>;
}) {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "marketplace.moderate")) {
    redirect("/admin");
  }

  const params = await searchParams;

  const [products, sellers, categories] = await Promise.all([
    listModerationProducts(teamId, {
      sellerId: params.sellerId || undefined,
      status: params.status || undefined,
      categoryId: params.categoryId || undefined,
      name: params.name || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
    }),
    listSellersForClub(teamId),
    listCategoriesForClub(teamId),
  ]);

  const rows = products.map((product) => ({
    id: product.id,
    name: product.name,
    sellerName: product.seller?.businessName ?? product.sellerId,
    price: Number(product.price),
    status: product.status,
    rejectionReason: product.rejectionReason,
    reviewedBy: product.reviewedBy,
    reviewedAt: product.reviewedAt,
    createdAt: product.createdAt,
  }));

  const smallInputClass = "form-control form-control-sm";

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Modération marketplace</h1>

      <div className="card mb-4">
        <div className="card-body">
          <form method="get" className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small mb-1">Vendeur</label>
              <select name="sellerId" className={smallInputClass} defaultValue={params.sellerId ?? ""}>
                <option value="">Tous</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.businessName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small mb-1">Statut</label>
              <select name="status" className={smallInputClass} defaultValue={params.status ?? ""}>
                <option value="">Tous</option>
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small mb-1">Catégorie</label>
              <select name="categoryId" className={smallInputClass} defaultValue={params.categoryId ?? ""}>
                <option value="">Toutes</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small mb-1">Nom</label>
              <input type="text" name="name" className={smallInputClass} defaultValue={params.name ?? ""} placeholder="Rechercher..." />
            </div>
            <div className="col-6 col-md-1">
              <label className="form-label small mb-1">Du</label>
              <input type="date" name="from" className={smallInputClass} defaultValue={params.from ?? ""} />
            </div>
            <div className="col-6 col-md-1">
              <label className="form-label small mb-1">Au</label>
              <input type="date" name="to" className={smallInputClass} defaultValue={params.to ?? ""} />
            </div>
            <div className="col-12 col-md-1 d-grid">
              <button type="submit" className="btn btn-primary btn-sm">
                Filtrer
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <ModerationTable products={rows} />
        </div>
      </div>
    </div>
  );
}
