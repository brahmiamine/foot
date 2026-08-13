import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubscriptionCategoryDetail } from "@/lib/subscriptions";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { formatDateOnly, formatPriceTnd } from "@/lib/format";
import { SubscriptionPurchaseForm } from "@/components/SubscriptionPurchaseForm";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export default async function SubscriptionCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { locale, t } = await getTranslator();
  const { id } = await params;
  const category = await getSubscriptionCategoryDetail(id);
  if (!category) notFound();

  const session = await getSsoSession();
  const loginUrl = !session || session.role !== "MEMBER" ? await buildMemberLoginUrlForPath(`/abonnements/${id}`) : null;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <Link href="/abonnements" style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {t("common.allMatches")}
      </Link>

      <div style={{ marginTop: 10, marginBottom: 4, fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {localized(locale, category.clubName, category.clubNameAr)}
      </div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0, marginBottom: 4 }}>{category.name}</h1>
      {category.description && <p style={{ color: "var(--tk-text-muted)", marginTop: 0 }}>{category.description}</p>}

      <div
        style={{
          background: "var(--tk-surface)",
          border: "1px solid var(--tk-border)",
          borderInlineStart: category.color ? `4px solid ${category.color}` : undefined,
          borderRadius: "var(--tk-radius-md)",
          padding: "1rem 1.15rem",
          marginTop: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong>{t("subscriptions.title")}</strong>
          <span>{formatPriceTnd(category.price, locale)}</span>
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 2 }}>
          {t("subscriptions.validity", {
            from: formatDateOnly(category.validFrom, locale),
            until: formatDateOnly(category.validUntil, locale),
          })}
        </div>

        {loginUrl ? (
          <a
            href={loginUrl}
            style={{ display: "inline-block", marginTop: 10, fontSize: "0.82rem", color: "var(--tk-primary)", fontWeight: 600 }}
          >
            {t("subscriptions.login")}
          </a>
        ) : (
          <SubscriptionPurchaseForm subscriptionCategoryId={category.id} price={category.price} />
        )}
      </div>
    </main>
  );
}
