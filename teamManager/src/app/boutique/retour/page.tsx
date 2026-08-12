import Link from "next/link";
import { reconcileOrderPayment } from "@/services/ShopOrderService";

export const dynamic = "force-dynamic";

/**
 * Page de statut atteignable après redirection du provider — même flux que
 * billetterie/src/app/paiement/retour/page.tsx (voir ce fichier pour le
 * détail). Le vrai filet de sécurité reste le rattrapage opportuniste dans
 * listMyOrders (voir ShopOrderService.ts), qui ne dépend d'aucune
 * redirection.
 */
export default async function BoutiqueReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId } = await searchParams;

  if (!paymentId) {
    return (
      <Main>
        <Status color="var(--bs-danger)" title="Lien de retour invalide" />
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
        <Status color="var(--bs-success)" title="Paiement confirmé" />
        <p className="text-muted">Votre commande est disponible dans « Mes commandes ».</p>
      </Main>
    );
  }

  if (result === "CANCELLED") {
    return (
      <Main>
        <Status color="var(--bs-danger)" title="Paiement échoué ou annulé" />
        <p className="text-muted">Votre commande a été annulée et le stock libéré. Vous pouvez retenter l&apos;achat.</p>
      </Main>
    );
  }

  return (
    <Main>
      <Status color="var(--bs-secondary)" title="Paiement en cours de vérification" />
      <p className="text-muted">Le statut définitif peut prendre quelques instants. Consultez « Mes commandes » dans peu de temps.</p>
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-5 text-center" style={{ maxWidth: 480 }}>
      {children}
      <p className="mt-4">
        <Link href="/boutique/commandes" className="fw-bold">
          Voir mes commandes
        </Link>
      </p>
    </div>
  );
}

function Status({ color, title }: { color: string; title: string }) {
  return <h1 className="h4 mb-2" style={{ color }}>{title}</h1>;
}
