"use client";

import { useState } from "react";
import { purchaseAction } from "./actions";

export function PurchaseForm({ productId, price, stock }: { productId: number; price: string; stock: number }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQuantity = Math.max(1, Math.min(stock, 20));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await purchaseAction(productId, quantity);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      window.location.href = result.payUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Achat impossible.");
      setLoading(false);
    }
  }

  if (stock <= 0) {
    return <span className="badge bg-danger-subtle text-danger">Rupture de stock</span>;
  }

  return (
    <form onSubmit={handleSubmit} className="d-flex align-items-center gap-2 mt-2">
      {error && <div className="alert alert-danger py-1 px-2 mb-0 small w-100">{error}</div>}
      <input
        type="number"
        min={1}
        max={maxQuantity}
        value={quantity}
        onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value, 10) || 1)))}
        className="form-control form-control-sm"
        style={{ width: 70 }}
        aria-label="Quantité"
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
            Achat en cours…
          </>
        ) : (
          `Acheter — ${Number(price).toFixed(3)} DT`
        )}
      </button>
    </form>
  );
}
