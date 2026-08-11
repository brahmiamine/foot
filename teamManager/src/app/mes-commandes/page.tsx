import { redirect } from "next/navigation";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { listMyOrders } from "@/services/OrderService";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-secondary-subtle text-secondary",
  PAID: "bg-success-subtle text-success",
  CANCELLED: "bg-danger-subtle text-danger",
};

/** Espace membre : historique des commandes boutique, réconciliation opportuniste au chargement (voir OrderService.listMyOrders). */
export default async function MesCommandesPage() {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
    redirect(await buildMemberLoginUrlForPath("/mes-commandes"));
  }

  const orders = await listMyOrders(session.id);

  return (
    <main className="container py-5" style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-4">Mes commandes</h1>

      {orders.length === 0 ? (
        <p className="text-muted">Vous n&rsquo;avez encore passé aucune commande.</p>
      ) : (
        <div className="d-flex flex-column gap-3">
          {orders.map((order) => (
            <div key={order.id} className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-baseline">
                  <strong>
                    {order.productNameFr} × {order.quantity}
                  </strong>
                  <span className={`badge ${STATUS_BADGE[order.status] ?? "bg-secondary-subtle text-secondary"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <div className="small text-muted mt-1">
                  {order.createdAt.toLocaleString("fr-FR")}
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <span>
                    Réf. <code>{order.reference}</code>
                  </span>
                  <span>{Number(order.totalAmount).toFixed(3)} DT</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
