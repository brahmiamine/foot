import Link from "next/link";
import { reconcileTicketPayment } from "@/lib/tickets";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

// Page de statut atteignable à la main (ex: lien envoyé par email) ou par
// redirection automatique du provider. Konnect redirige ici automatiquement
// si KONNECT_SUCCESS_URL/KONNECT_FAIL_URL sont configurées côté payment-api
// (voir konnect.mapper.ts, withPaymentId — paymentId ajouté en query string
// par payment-api lui-même) ; sans ces variables d'environnement, le payeur
// n'est pas redirigé automatiquement. Dans tous les cas, le vrai filet de
// sécurité est le rattrapage opportuniste dans listMyTickets (voir
// src/lib/tickets.ts), qui ne dépend d'aucune redirection — un supporter qui
// revient sur "Mes billets" verra son billet passer PENDING -> PAID même
// sans jamais atteindre cette page.
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
        <TicketLink label={t("payment.viewTickets")} />
      </Main>
    );
  }

  let result: "PAID" | "PENDING" | "CANCELLED";
  try {
    result = await reconcileTicketPayment(paymentId);
  } catch (error) {
    console.error("reconcileTicketPayment failed on return page:", error);
    result = "PENDING";
  }

  if (result === "PAID") {
    return (
      <Main>
        <Status color="var(--tk-success)" title={t("payment.confirmed")} />
        <p style={{ color: "var(--tk-text-muted)" }}>{t("payment.available")}</p><TicketLink label={t("payment.viewTickets")} />
      </Main>
    );
  }

  if (result === "CANCELLED") {
    return (
      <Main>
        <Status color="var(--tk-danger)" title={t("payment.failed")} />
        <p style={{ color: "var(--tk-text-muted)" }}>{t("payment.released")}</p><TicketLink label={t("payment.viewTickets")} />
      </Main>
    );
  }

  return (
    <Main>
      <Status color="var(--tk-text-muted)" title={t("payment.checking")} />
      <p style={{ color: "var(--tk-text-muted)" }}>{t("payment.wait")}</p><TicketLink label={t("payment.viewTickets")} />
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

function TicketLink({ label }: { label: string }) { return <p style={{ marginTop: 24 }}><Link href="/mes-billets" style={{ color: "var(--tk-primary)", fontWeight: 600 }}>{label}</Link></p>; }

function Status({ color, title }: { color: string; title: string }) {
  return (
    <h1 style={{ fontSize: "1.25rem", color, marginBottom: 8 }}>{title}</h1>
  );
}
