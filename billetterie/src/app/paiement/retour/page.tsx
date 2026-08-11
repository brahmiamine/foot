import Link from "next/link";
import { reconcileTicketPayment } from "@/lib/tickets";

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
  const { paymentId } = await searchParams;

  if (!paymentId) {
    return (
      <Main>
        <Status color="var(--tk-danger)" title="Lien de retour invalide" />
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
        <Status color="var(--tk-success)" title="Paiement confirmé" />
        <p style={{ color: "var(--tk-text-muted)" }}>Vos billets sont disponibles dans « Mes billets ».</p>
      </Main>
    );
  }

  if (result === "CANCELLED") {
    return (
      <Main>
        <Status color="var(--tk-danger)" title="Paiement échoué ou annulé" />
        <p style={{ color: "var(--tk-text-muted)" }}>
          Votre réservation a été libérée. Vous pouvez retenter l&apos;achat depuis la page du match.
        </p>
      </Main>
    );
  }

  return (
    <Main>
      <Status color="var(--tk-text-muted)" title="Paiement en cours de vérification" />
      <p style={{ color: "var(--tk-text-muted)" }}>
        Le statut définitif peut prendre quelques instants. Consultez « Mes billets » dans peu de temps.
      </p>
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 1.25rem", textAlign: "center" }}>
      {children}
      <p style={{ marginTop: 24 }}>
        <Link href="/mes-billets" style={{ color: "var(--tk-primary)", fontWeight: 600 }}>
          Voir mes billets
        </Link>
      </p>
    </main>
  );
}

function Status({ color, title }: { color: string; title: string }) {
  return (
    <h1 style={{ fontSize: "1.25rem", color, marginBottom: 8 }}>{title}</h1>
  );
}
