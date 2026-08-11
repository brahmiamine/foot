import Link from "next/link";
import shared from "@/components/shared.module.css";

export const metadata = {
  title: "Mes commandes — Espace membre — Olympique de Béja",
};

export default function CommandesPage() {
  return (
    <div className={shared.card} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Mes commandes</h2>
      <p style={{ color: "var(--ob-text-muted)" }}>
        Le paiement en ligne de la boutique n&apos;est pas encore disponible : cet espace affichera l&apos;historique
        de vos commandes (statut, suivi, facture) une fois le tunnel d&apos;achat ouvert. Pour l&apos;instant, la{" "}
        <Link href="/boutique">boutique</Link> reste consultable, sans commande en ligne.
      </p>
    </div>
  );
}
