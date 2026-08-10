"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { ORDER_STATUSES } from "@/types/orders";
import { createOrder, setOrderStatus, deleteOrder } from "./actions";

const STATUS_LABELS: Record<string, string> = { PENDING: "En attente", CONFIRMED: "Confirmée", READY: "Prête", DELIVERED: "Livrée", CANCELLED: "Annulée" };
const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-secondary",
  CONFIRMED: "bg-primary",
  READY: "bg-warning text-dark",
  DELIVERED: "bg-success",
  CANCELLED: "bg-danger",
};

interface ProductOption {
  id: number;
  name: string;
  price: string;
  stock: number;
}

interface OrderItemData {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: string;
}

interface OrderData {
  id: number;
  customerName: string;
  customerPhone: string | null;
  status: string;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  items: OrderItemData[];
}

export function OrdersManagement({ initialOrders, products, canManage }: { initialOrders: OrderData[]; products: ProductOption[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState<Array<{ productId: string; quantity: number }>>([{ productId: "", quantity: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((prev) => [...prev, { productId: "", quantity: 1 }]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: "productId" | "quantity", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: field === "quantity" ? Number(value) : value } : r)));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await createOrder(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        setRows([{ productId: "", quantity: 1 }]);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (order: OrderData, status: string) => {
    const result = await setOrderStatus(order.id, status);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur");
  };

  const handleDelete = async (order: OrderData) => {
    if (!(await confirm(`Supprimer la commande de ${order.customerName} ?`))) return;
    const result = await deleteOrder(order.id);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur lors de la suppression");
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Commandes boutique</h1>
          <p className="text-muted mb-0">Commandes passées sur le catalogue de la boutique du club.</p>
        </div>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            {showForm ? "Annuler" : "Nouvelle commande"}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Nouvelle commande</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Nom du client</label>
                  <input type="text" name="customerName" className="form-control" maxLength={150} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Téléphone</label>
                  <input type="tel" name="customerPhone" className="form-control" maxLength={30} />
                </div>
                <div className="col-md-5">
                  <label className="form-label">Notes</label>
                  <input type="text" name="notes" className="form-control" maxLength={500} />
                </div>
              </div>

              <label className="form-label">Articles</label>
              {rows.map((row, idx) => (
                <div className="row g-2 align-items-end mb-2" key={idx}>
                  <div className="col-md-6">
                    <select
                      name="productId"
                      className="form-select form-select-sm"
                      value={row.productId}
                      onChange={(e) => updateRow(idx, "productId", e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Choisir un produit
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {Number(p.price).toFixed(3)} TND ({p.stock} en stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <input
                      type="number"
                      name="quantity"
                      min={1}
                      className="form-control form-control-sm"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    {rows.length > 1 && (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeRow(idx)}>
                        <i className="fas fa-times" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={addRow}>
                <i className="fas fa-plus me-1" aria-hidden="true" />
                Ajouter un article
              </button>

              <div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialOrders.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucune commande</p>
          </div>
        </div>
      ) : (
        initialOrders.map((o) => (
          <div className="card mb-3" key={o.id}>
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <strong>{o.customerName}</strong>
                {o.customerPhone && <span className="text-muted small ms-2">{o.customerPhone}</span>}
                <div className="text-muted small">{new Date(o.createdAt).toLocaleString("fr-FR")}</div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <strong>{Number(o.totalAmount).toFixed(3)} TND</strong>
                {canManage ? (
                  <select className="form-select form-select-sm" style={{ width: "auto" }} value={o.status} onChange={(e) => handleStatusChange(o, e.target.value)} disabled={isPending}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`badge ${STATUS_BADGES[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                )}
                {canManage && (
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(o)}>
                    <i className="fas fa-trash" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {o.items.map((i) => (
                  <li key={i.id} className="list-group-item d-flex justify-content-between px-0">
                    <span>
                      {i.quantity} × {i.productName}
                    </span>
                    <span>{(Number(i.unitPrice) * i.quantity).toFixed(3)} TND</span>
                  </li>
                ))}
              </ul>
              {o.notes && <p className="text-muted small mt-2 mb-0">{o.notes}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
