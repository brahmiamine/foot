import Link from "next/link";
import shared from "@/components/shared.module.css";

export const metadata = {
  title: "Mes billets — Espace membre — Olympique de Béja",
};

export default function BilletsPage() {
  return (
    <div className={shared.card} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Mes billets</h2>
      <p style={{ color: "var(--ob-text-muted)" }}>
        La billetterie en ligne n&apos;est pas encore disponible : cet espace affichera vos billets (match, catégorie,
        QR code) dès son ouverture. En attendant, les places se retirent au stade — voir la rubrique{" "}
        <Link href="/#billetterie">billetterie</Link>.
      </p>
    </div>
  );
}
