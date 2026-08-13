import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { listMySubscriptions } from "@/lib/subscriptions";
import { signSubscriptionToken } from "@/lib/subscriptionQr";
import { formatDateOnly, formatPriceTnd } from "@/lib/format";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

const STATUS_KEYS = { PENDING: "status.pending", PAID: "status.paid", CANCELLED: "status.cancelled" } as const;

export default async function MySubscriptionsPage() {
  const { locale, t } = await getTranslator();
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
    redirect(await buildMemberLoginUrlForPath("/mes-abonnements"));
  }

  const subscriptions = await listMySubscriptions(session.id);
  // QR de contrôle d'accès — uniquement pour les abonnements payés, comme
  // "mes-billets" (voir src/lib/subscriptionQr.ts).
  const qrCodeById = new Map(
    await Promise.all(
      subscriptions
        .filter((s) => s.status === "PAID")
        .map(async (s) => [s.id, await QRCode.toDataURL(await signSubscriptionToken(s.id))] as const),
    ),
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <Link href="/abonnements" style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>
        {t("common.allMatches")}
      </Link>
      <h1 style={{ fontSize: "1.35rem", marginTop: 10, marginBottom: "1.25rem" }}>{t("mySubscriptions.title")}</h1>

      {subscriptions.length === 0 ? (
        <p style={{ color: "var(--tk-text-muted)" }}>{t("mySubscriptions.empty")}</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              style={{
                background: "var(--tk-surface)",
                border: "1px solid var(--tk-border)",
                borderInlineStart: subscription.color ? `4px solid ${subscription.color}` : undefined,
                borderRadius: "var(--tk-radius-md)",
                padding: "1rem 1.15rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>
                  {localized(locale, subscription.clubName, subscription.clubNameAr)} — {subscription.categoryName}
                </strong>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: subscription.status === "PAID" ? "var(--tk-success)" : "var(--tk-text-muted)",
                  }}
                >
                  {t(STATUS_KEYS[subscription.status])}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 4 }}>
                {t("mySubscriptions.validity", {
                  from: formatDateOnly(subscription.validFrom, locale),
                  until: formatDateOnly(subscription.validUntil, locale),
                })}
              </div>
              {subscription.lastValidatedOn && (
                <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 2 }}>
                  {t("mySubscriptions.lastValidated", { date: formatDateOnly(subscription.lastValidatedOn, locale) })}
                </div>
              )}
              <div style={{ fontSize: "0.82rem", marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span>
                  {t("common.reference")} <code>{subscription.reference}</code>
                </span>
                <span>{formatPriceTnd(subscription.price, locale)}</span>
              </div>
              {qrCodeById.has(subscription.id) && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté serveur, pas une image distante */}
                  <img
                    src={qrCodeById.get(subscription.id)}
                    alt="QR code de contrôle d'accès"
                    width={160}
                    height={160}
                    style={{ borderRadius: "var(--tk-radius-md)" }}
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--tk-text-muted)", marginTop: 4 }}>{t("mySubscriptions.qrHint")}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
