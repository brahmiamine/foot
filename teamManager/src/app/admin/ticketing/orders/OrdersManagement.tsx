"use client";

import Link from "next/link";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";

type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

interface OrderData {
  id: number;
  orderNumber: string;
  eventLabel: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  createdAt: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = { PENDING: "En attente", CONFIRMED: "Confirmée", CANCELLED: "Annulée", EXPIRED: "Expirée" };
const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-warning-subtle text-warning",
  CONFIRMED: "bg-success-subtle text-success",
  CANCELLED: "bg-danger-subtle text-danger",
  EXPIRED: "bg-secondary-subtle text-secondary",
};

export function OrdersManagement({ initialOrders }: { initialOrders: OrderData[] }) {
  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleOrders } = useListFilter(initialOrders, {
    searchableText: (o) => `${o.orderNumber} ${o.eventLabel} ${o.customerName} ${o.customerEmail}`,
  });

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Commandes</h1>
          <p className="text-muted mb-0">Commandes de billets passées sur le site public (aucun paiement en V1).</p>
        </div>
        <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher une commande..." />
      </div>

      {initialOrders.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucune commande</p>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>N° commande</th>
                  <th>Billetterie</th>
                  <th>Client</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-semibold">{o.orderNumber}</td>
                    <td>{o.eventLabel}</td>
                    <td>
                      <div>{o.customerName}</div>
                      <div className="text-muted small">{o.customerEmail}</div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                    </td>
                    <td className="text-muted small">{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                    <td className="text-end">
                      <Link href={`/admin/ticketing/orders/${o.id}`} className="btn btn-sm btn-outline-secondary">
                        <i className="fas fa-eye" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
    </div>
  );
}
