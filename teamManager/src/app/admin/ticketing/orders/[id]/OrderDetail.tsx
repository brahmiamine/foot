"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { cancelTicket } from "../../tickets/actions";

type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
type TicketStatus = "HELD" | "ISSUED" | "USED" | "CANCELLED" | "EXPIRED";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = { PENDING: "En attente", CONFIRMED: "Confirmée", CANCELLED: "Annulée", EXPIRED: "Expirée" };
const TICKET_STATUS_LABELS: Record<TicketStatus, string> = { HELD: "Réservé", ISSUED: "Émis", USED: "Utilisé", CANCELLED: "Annulé", EXPIRED: "Expiré" };
const TICKET_STATUS_BADGE: Record<TicketStatus, string> = {
  HELD: "bg-warning-subtle text-warning",
  ISSUED: "bg-info-subtle text-info",
  USED: "bg-success-subtle text-success",
  CANCELLED: "bg-danger-subtle text-danger",
  EXPIRED: "bg-secondary-subtle text-secondary",
};

export function OrderDetail({
  order,
  items,
  tickets,
  canCancel,
}: {
  order: { id: number; orderNumber: string; customerName: string; customerEmail: string; customerPhone: string | null; status: OrderStatus; createdAt: string };
  items: Array<{ id: number; categoryName: string; quantity: number; unitPrice: number }>;
  tickets: Array<{ id: number; ticketNumber: string; categoryName: string; holderName: string; status: TicketStatus }>;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async (ticketId: number, ticketNumber: string) => {
    if (!(await confirm(`Annuler le billet ${ticketNumber} ?`, { variant: "danger" }))) return;
    const result = await cancelTicket(ticketId);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de l'annulation");
    }
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="mb-4">
        <Link href="/admin/ticketing/orders" className="text-decoration-none small">
          <i className="fas fa-arrow-left me-1" aria-hidden="true" />
          Retour aux commandes
        </Link>
        <h1 className="h4 mt-2 mb-1">Commande {order.orderNumber}</h1>
        <span className="badge bg-info-subtle text-info">{ORDER_STATUS_LABELS[order.status]}</span>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Client</h5>
            </div>
            <div className="card-body">
              <p className="mb-1">{order.customerName}</p>
              <p className="mb-1 text-muted small">{order.customerEmail}</p>
              {order.customerPhone && <p className="mb-1 text-muted small">{order.customerPhone}</p>}
              <p className="text-muted small mb-0">Commandée le {new Date(order.createdAt).toLocaleString("fr-FR")}</p>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Articles</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Catégorie</th>
                    <th>Quantité</th>
                    <th>Prix unitaire</th>
                    <th>Sous-total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.categoryName}</td>
                      <td>{i.quantity}</td>
                      <td>{i.unitPrice.toFixed(3)} DT</td>
                      <td>{(i.quantity * i.unitPrice).toFixed(3)} DT</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-end fw-semibold">
                      Total indicatif
                    </td>
                    <td className="fw-semibold">{total.toFixed(3)} DT</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Billets</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>N° billet</th>
                    <th>Catégorie</th>
                    <th>Titulaire</th>
                    <th>Statut</th>
                    {canCancel && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.ticketNumber}</td>
                      <td>{t.categoryName}</td>
                      <td>{t.holderName}</td>
                      <td>
                        <span className={`badge ${TICKET_STATUS_BADGE[t.status]}`}>{TICKET_STATUS_LABELS[t.status]}</span>
                      </td>
                      {canCancel && (
                        <td className="text-end">
                          {(t.status === "ISSUED" || t.status === "HELD") && (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(t.id, t.ticketNumber)}>
                              <i className="fas fa-ban" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
