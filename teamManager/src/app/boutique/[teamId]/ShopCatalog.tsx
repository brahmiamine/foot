"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatPriceTnd } from "@/lib/format";
import { checkoutAction } from "./actions";
import type { ProductSummary } from "@/services/ShopOrderService";

/**
 * Panier client (localStorage, une clé par club — voir /boutique/[teamId] :
 * un panier ne peut donc jamais mélanger deux clubs, structurellement, pas
 * seulement par validation serveur). Le serveur revalide tout au moment de
 * la commande (stock, prix, club) — voir ShopOrderService.createOrder.
 */
function cartStorageKey(teamId: string): string {
  return `tm-shop-cart-${teamId}`;
}

function readCart(teamId: string): Record<number, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(cartStorageKey(teamId));
    return raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    return {};
  }
}

export function ShopCatalog({ teamId, products }: { teamId: string; products: ProductSummary[] }) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(readCart(teamId));
  }, [teamId]);

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey(teamId), JSON.stringify(cart));
  }, [teamId, cart]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function setQuantity(productId: number, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      return next;
    });
  }

  const cartEntries = Object.entries(cart)
    .map(([id, quantity]) => ({ product: productById.get(Number(id)), quantity }))
    .filter((entry): entry is { product: ProductSummary; quantity: number } => !!entry.product);

  const total = cartEntries.reduce((sum, entry) => sum + parseFloat(entry.product.price) * entry.quantity, 0);

  async function handleCheckout() {
    if (cartEntries.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await checkoutAction(
        teamId,
        cartEntries.map((e) => ({ productId: e.product.id, quantity: e.quantity })),
      );
      // checkoutAction redirige en cas de succès (throw NEXT_REDIRECT côté
      // serveur) : on n'atteint ce code que sur un échec.
      if (result && !result.success) {
        setError(result.error);
      }
    } catch (e) {
      // redirect() dans checkoutAction() remonte comme une exception
      // spéciale marquée `digest: "NEXT_REDIRECT;..."` : ne jamais
      // l'intercepter comme une vraie erreur, sous peine de casser la
      // redirection vers la page de paiement.
      const digest = (e as { digest?: string })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
      setError(e instanceof Error ? e.message : "Échec de la commande.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="row g-4">
      <div className="col-md-8">
        {products.length === 0 ? (
          <p className="text-muted">Aucun article en vente pour le moment.</p>
        ) : (
          <div className="row g-3">
            {products.map((product) => {
              const inCart = cart[product.id] ?? 0;
              return (
                <div key={product.id} className="col-sm-6">
                  <div className="card h-100 shadow-sm">
                    <ImageWithFallback
                      src={product.imageUrl ?? undefined}
                      alt={product.nameFr}
                      style={{ height: 140, objectFit: "cover" }}
                      fallbackIcon="fas fa-shirt fa-2x"
                    />
                    <div className="card-body d-flex flex-column">
                      <h2 className="h6 mb-1">{product.nameFr}</h2>
                      {product.categoryName && <p className="small text-muted mb-1">{product.categoryName}</p>}
                      <p className="fw-bold mb-2">{formatPriceTnd(product.price)}</p>
                      <p className="small text-muted mb-3">
                        {product.stock > 0 ? `${product.stock} en stock` : "Rupture de stock"}
                      </p>
                      <div className="mt-auto d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={inCart === 0}
                          onClick={() => setQuantity(product.id, inCart - 1)}
                        >
                          -
                        </button>
                        <span>{inCart}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={inCart >= product.stock}
                          onClick={() => setQuantity(product.id, inCart + 1)}
                        >
                          +
                        </button>
                        {inCart === 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary ms-auto"
                            disabled={product.stock === 0}
                            onClick={() => setQuantity(product.id, 1)}
                          >
                            Ajouter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="col-md-4">
        <div className="card shadow-sm" style={{ position: "sticky", top: 16 }}>
          <div className="card-body">
            <h2 className="h6 mb-3">Panier</h2>
            {cartEntries.length === 0 ? (
              <p className="text-muted small">Votre panier est vide.</p>
            ) : (
              <>
                <ul className="list-unstyled mb-3">
                  {cartEntries.map((entry) => (
                    <li key={entry.product.id} className="d-flex justify-content-between small mb-1">
                      <span>
                        {entry.quantity} × {entry.product.nameFr}
                      </span>
                      <span>{formatPriceTnd(parseFloat(entry.product.price) * entry.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="d-flex justify-content-between fw-bold mb-3">
                  <span>Total</span>
                  <span>{formatPriceTnd(total)}</span>
                </div>
                {error && <p className="text-danger small">{error}</p>}
                <button type="button" className="btn btn-primary w-100" disabled={submitting} onClick={handleCheckout}>
                  {submitting ? "..." : "Passer commande"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
