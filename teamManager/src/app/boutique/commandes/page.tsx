import Link from "next/link";
import { redirect } from "next/navigation";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { listMyOrders } from "@/services/ShopOrderService";
import { formatPriceTnd } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

export default async function MyOrdersPage() {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
    redirect(await buildMemberLoginUrlForPath("/boutique/commandes"));
  }

  const orders = await listMyOrders(session.id);

  return (
    <div className="container py-5" style={{ maxWidth: 720 }}>
      <Link href="/boutique" className="small text-muted">
        &larr; Boutique
      </Link>
      <h1 className="h3 mt-2 mb-4">Mes commandes</h1>

      {orders.length === 0 ? (
        <p className="text-muted">Vous n&rsquo;avez encore passé aucune commande.</p>
      ) : (
        <div className="d-flex flex-column gap-3">
          {orders.map((order) => (
            <div key={order.id} className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-baseline">
                  <strong>{order.teamName}</strong>
                  <span className={order.status === "PAID" ? "text-success fw-bold small" : "text-muted small"}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <ul className="list-unstyled small text-muted mt-2 mb-2">
                  {order.items.map((item, idx) => (
                    <li key={idx}>
                      {item.quantity} × {item.productNameFr} — {formatPriceTnd(item.lineTotal)}
                    </li>
                  ))}
                </ul>
                <div className="d-flex justify-content-between">
                  <span className="small text-muted">{new Date(order.createdAt).toLocaleDateString("fr-FR")}</span>
                  <strong>{formatPriceTnd(order.totalPrice)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
