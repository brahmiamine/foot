import Link from "next/link";
import { reconcilePayment, type PaymentKind } from "@/lib/payments";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

// Page de statut atteignable à la main (ex: lien envoyé par email) ou par
// redirection automatique du provider. Konnect redirige ici automatiquement
// si KONNECT_SUCCESS_URL/KONNECT_FAIL_URL sont configurées côté payment-api
// (voir konnect.mapper.ts, withPaymentId — paymentId ajouté en query string
// par payment-api lui-même) ; sans ces variables d'environnement, le payeur
// n'est pas redirigé automatiquement. Dans tous les cas, le vrai filet de
// sécurité est le rattrapage opportuniste dans listMyTickets/listMySubscriptions
// (voir src/lib/tickets.ts et src/lib/subscriptions.ts), qui ne dépend
// d'aucune redirection — un supporter qui revient sur "Mes billets"/"Mes
// abonnements" verra son achat passer PENDING -> PAID même sans jamais
// atteindre cette page.
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { t } = await getTranslator();
  const { paymentId } = await searchParams;

  if (!paymentId) {
    return (
      <Main>
        <Status color="var(--tk-danger)" title={t("payment.invalid")} />
        <PurchaseLink kind="TICKET" label={t("payment.viewTickets")} />
      </Main>
    );
  }

  let kind: PaymentKind = "UNKNOWN";
  let result: string = "PENDING";
  try {
    const reconciled = await reconcilePayment(paymentId);
    kind = reconciled.kind;
    result = reconciled.result;
  } catch (error) {
    console.error("reconcilePayment failed on return page:", error);
  }

  if (result === "PAID") {
    return (
      <Main>
        <Status color="var(--tk-success)" title={t("payment.confirmed")} />
        <p style={{ color: "var(--tk-text-muted)" }}>{t("payment.available")}</p>
        <PurchaseLink kind={kind} label={t("payment.viewTickets")} />
      </Main>
    );
  }

  // TASK-P0-016 : paiement confirmé par le fournisseur après que la
  // réservation a expiré et libéré la capacité — jamais "payment.failed"
  // (le paiement a bien eu lieu) ni "payment.confirmed" (aucun billet
  // disponible). Ne concerne que les billets (capacité de match limitée) —
  // un abonnement n'a pas de capacité à perdre, voir lib/subscriptions.ts.
  if (result === "PAID_STOCK_UNAVAILABLE") {
    return (
      <Main>
        <Status color="var(--tk-danger)" title={t("payment.stockUnavailable")} />
        <p style={{ color: "var(--tk-text-muted)" }}>{t("payment.stockUnavailableDetail")}</p>
      </Main>
    );
  }

  if (result === "CANCELLED") {
    return (
      <Main>
        <Status color="var(--tk-danger)" title={t("payment.failed")} />
        <p style={{ color: "var(--tk-text-muted)" }}>{t("payment.released")}</p>
        <PurchaseLink kind={kind} label={t("payment.viewTickets")} />
      </Main>
    );
  }

  return (
    <Main>
      <Status color="var(--tk-text-muted)" title={t("payment.checking")} />
      <p style={{ color: "var(--tk-text-muted)" }}>{t("payment.wait")}</p>
      <PurchaseLink kind={kind} label={t("payment.viewTickets")} />
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 1.25rem", textAlign: "center" }}>
      {children}
    </main>
  );
}

function PurchaseLink({ kind, label }: { kind: PaymentKind; label: string }) {
  const href = kind === "SUBSCRIPTION" ? "/mes-abonnements" : "/mes-billets";
  return (
    <p style={{ marginTop: 24 }}>
      <Link href={href} style={{ color: "var(--tk-primary)", fontWeight: 600 }}>
        {label}
      </Link>
    </p>
  );
}

function Status({ color, title }: { color: string; title: string }) {
  return (
    <h1 style={{ fontSize: "1.25rem", color, marginBottom: 8 }}>{title}</h1>
  );
}
