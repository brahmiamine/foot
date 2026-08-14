import { requireTeamId } from "@/lib/team-context";
import { listOrdersForTeam } from "@/services/ShopOrderService";
import { formatPriceTnd } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-secondary-subtle text-secondary",
  PAID: "bg-success-subtle text-success",
  CANCELLED: "bg-danger-subtle text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

/**
 * Vue admin des commandes boutique — lecture seule (pas de gestion de
 * livraison/expédition, hors périmètre v1 voir avancement.md et
 * ShopOrderService.listOrdersForTeam).
 */
export default async function ShopOrdersPage() {
  const teamId = await requireTeamId();
  const orders = await listOrdersForTeam(teamId);

  return (
    <div>
      <h1 className="h4 mb-4">Commandes boutique</h1>
      {orders.length === 0 ? (
        <p className="text-muted">Aucune commande pour le moment.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Articles</th>
                <th>Total</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.createdAt.toLocaleDateString("fr-FR")}</td>
                  <td>{order.itemCount}</td>
                  <td>{formatPriceTnd(order.totalPrice)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGES[order.status] ?? ""}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
