import Link from "next/link";
import { reconcileOrderPayment } from "@/services/OrderService";

export const dynamic = "force-dynamic";

// Page de statut atteignable à la main (ex: lien envoyé par email) ou par
// redirection automatique du provider si configurée. Limite connue, partagée
// avec billetterie (voir avancement.md § 3.H) : l'intégration Konnect de
// payment-api ne transmet pas de successUrl/failUrl à Konnect — avec le
// provider par défaut, l'acheteur n'est PAS automatiquement redirigé ici
// après paiement. Le vrai filet de sécurité est le rattrapage opportuniste
// dans listMyOrders (voir src/services/OrderService.ts), qui ne dépend
// d'aucune redirection — un supporter qui revient sur "Mes commandes" verra
// sa commande passer PENDING -> PAID même sans jamais atteindre cette page.
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;

  if (!paymentId) {
    return (
      <Main>
        <Status variant="danger" title="Lien de retour invalide" />
      </Main>
    );
  }

  let result: "PAID" | "PENDING" | "CANCELLED";
  try {
    result = await reconcileOrderPayment(paymentId);
  } catch (error) {
    console.error("reconcileOrderPayment failed on return page:", error);
    result = "PENDING";
  }

  if (result === "PAID") {
    return (
      <Main>
        <Status variant="success" title="Paiement confirmé" />
        <p className="text-muted">Votre commande est disponible dans « Mes commandes ».</p>
      </Main>
    );
  }

  if (result === "CANCELLED") {
    return (
      <Main>
        <Status variant="danger" title="Paiement échoué ou annulé" />
        <p className="text-muted">
          Votre réservation a été libérée. Vous pouvez retenter l&apos;achat depuis la boutique du club.
        </p>
      </Main>
    );
  }

  return (
    <Main>
      <Status variant="secondary" title="Paiement en cours de vérification" />
      <p className="text-muted">Le statut définitif peut prendre quelques instants. Consultez « Mes commandes » dans peu de temps.</p>
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className="container py-5 text-center" style={{ maxWidth: 480 }}>
      {children}
      <p className="mt-4">
        <Link href="/mes-commandes" className="fw-semibold">
          Voir mes commandes
        </Link>
      </p>
    </main>
  );
}

function Status({ variant, title }: { variant: "success" | "danger" | "secondary"; title: string }) {
  return <h1 className={`h5 text-${variant} mb-2`}>{title}</h1>;
}
