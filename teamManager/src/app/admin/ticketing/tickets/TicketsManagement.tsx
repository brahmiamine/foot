"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { cancelTicket } from "./actions";

type TicketStatus = "HELD" | "ISSUED" | "USED" | "CANCELLED" | "EXPIRED";

interface TicketData {
  id: number;
  ticketNumber: string;
  eventLabel: string;
  categoryName: string;
  holderName: string;
  status: TicketStatus;
  issuedAt: string | null;
  usedAt: string | null;
}

const STATUS_LABELS: Record<TicketStatus, string> = { HELD: "Réservé", ISSUED: "Émis", USED: "Utilisé", CANCELLED: "Annulé", EXPIRED: "Expiré" };
const STATUS_BADGE: Record<TicketStatus, string> = {
  HELD: "bg-warning-subtle text-warning",
  ISSUED: "bg-info-subtle text-info",
  USED: "bg-success-subtle text-success",
  CANCELLED: "bg-danger-subtle text-danger",
  EXPIRED: "bg-secondary-subtle text-secondary",
};

export function TicketsManagement({ initialTickets, canCancel }: { initialTickets: TicketData[]; canCancel: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleTickets } = useListFilter(initialTickets, {
    searchableText: (t) => `${t.ticketNumber} ${t.eventLabel} ${t.categoryName} ${t.holderName}`,
  });

  const handleCancel = async (ticket: TicketData) => {
    if (!(await confirm(`Annuler le billet ${ticket.ticketNumber} ? Il sera rejeté au scan.`, { variant: "danger" }))) return;
    const result = await cancelTicket(ticket.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de l'annulation");
    }
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Billets</h1>
          <p className="text-muted mb-0">Recherche et annulation des billets individuels.</p>
        </div>
        <ListSearchInput value={search} onChange={setSearch} placeholder="N° billet, titulaire, match..." />
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {initialTickets.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun billet émis</p>
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
                  <th>N° billet</th>
                  <th>Billetterie</th>
                  <th>Catégorie</th>
                  <th>Titulaire</th>
                  <th>Statut</th>
                  {canCancel && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((t) => (
                  <tr key={t.id}>
                    <td className="fw-semibold">{t.ticketNumber}</td>
                    <td>{t.eventLabel}</td>
                    <td>{t.categoryName}</td>
                    <td>{t.holderName}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      {t.status === "USED" && t.usedAt && <div className="text-muted small">{new Date(t.usedAt).toLocaleString("fr-FR")}</div>}
                    </td>
                    {canCancel && (
                      <td className="text-end">
                        {(t.status === "ISSUED" || t.status === "HELD") && (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(t)}>
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
      )}
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
    </div>
  );
}
