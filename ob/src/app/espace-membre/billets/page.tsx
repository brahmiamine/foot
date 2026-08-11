import shared from "@/components/shared.module.css";

export const metadata = {
  title: "Mes billets — Espace membre — Olympique de Béja",
};

// La billetterie est une app générique séparée (voir README racine
// § « Billetterie »), pas réimplémentée ici — ce site reste en lecture
// seule sur la base partagée. billetterieUrl pointe vers son
// "mes-billets", où la session sso est revérifiée indépendamment.
export default function BilletsPage() {
  const billetterieUrl = process.env.NEXT_PUBLIC_BILLETTERIE_URL || "http://localhost:3005";

  return (
    <div className={shared.card} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Mes billets</h2>
      <p style={{ color: "var(--ob-text-muted)" }}>
        Vos billets (match, catégorie, statut de paiement) sont gérés sur la billetterie officielle, commune à tous
        les clubs.
      </p>
      <a href={`${billetterieUrl}/mes-billets`} className={shared.btnPrimary} style={{ marginTop: 8 }}>
        Voir mes billets sur la billetterie
      </a>
    </div>
  );
}
