import Link from "next/link";
import { listOpenSubscriptionCategories } from "@/lib/subscriptions";
import { formatDateOnly, formatPriceTnd } from "@/lib/format";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const { locale, t } = await getTranslator();
  const categories = await listOpenSubscriptionCategories();

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <Link href="/" style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {t("common.allMatches")}
      </Link>
      <h1 style={{ fontSize: "1.4rem", marginTop: 10, marginBottom: "0.25rem" }}>{t("subscriptions.title")}</h1>
      <p style={{ color: "var(--tk-text-muted)", marginTop: 0, marginBottom: "1.5rem" }}>{t("subscriptions.subtitle")}</p>

      {categories.length === 0 ? (
        <div
          style={{
            background: "var(--tk-surface)",
            border: "1px solid var(--tk-border)",
            borderRadius: "var(--tk-radius-md)",
            padding: "1.5rem",
            color: "var(--tk-text-muted)",
          }}
        >
          {t("subscriptions.empty")}
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.85rem" }}>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/abonnements/${category.id}`}
                style={{
                  display: "block",
                  background: "var(--tk-surface)",
                  border: "1px solid var(--tk-border)",
                  borderInlineStart: category.color ? `4px solid ${category.color}` : undefined,
                  borderRadius: "var(--tk-radius-md)",
                  padding: "1.1rem 1.25rem",
                  boxShadow: "var(--tk-shadow-sm)",
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginBottom: 6 }}>
                  {localized(locale, category.clubName, category.clubNameAr)}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.6rem" }}>
                  <strong style={{ fontSize: "1.02rem" }}>{category.name}</strong>
                  <span>{formatPriceTnd(category.price, locale)}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 4 }}>
                  {t("subscriptions.validity", {
                    from: formatDateOnly(category.validFrom, locale),
                    until: formatDateOnly(category.validUntil, locale),
                  })}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
