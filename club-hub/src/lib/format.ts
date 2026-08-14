/** Même format que ticketing/src/lib/format.ts — 3 décimales, dinar tunisien. */
export function formatPriceTnd(price: string | number): string {
  const value = typeof price === "string" ? parseFloat(price) : price;
  return `${value.toFixed(3)} DT`;
}
