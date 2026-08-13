import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/adminAuth";
import { buildAdminLoginUrlForPath } from "@/lib/ssoSession";
import { listRecentSubscriptionScans } from "@/lib/subscriptions";
import { formatMatchDateTime } from "@/lib/format";
import { SubscriptionScanner } from "@/components/admin/SubscriptionScanner";

export const dynamic = "force-dynamic";

/**
 * Scanner de contrôle d'accès pour les abonnements — pendant de
 * /admin/scan (billets), en ligne uniquement pour cette première version
 * (pas de caméra ni de mode hors-ligne : voir src/components/admin/
 * TicketScanner.tsx pour ce que ça impliquerait, hors scope pour un produit
 * sans capacité/quota à valider une fois par jour civil plutôt qu'une
 * fois pour toutes).
 */
export default async function ScanSubscriptionPage() {
  const authorized = await hasAdminSession();
  if (!authorized) {
    redirect(await buildAdminLoginUrlForPath("/admin/scan-abonnement"));
  }

  const scans = await listRecentSubscriptionScans();
  const rows = scans.map((s) => ({
    id: s.id,
    result: s.result,
    scannedBy: s.scannedBy,
    scannedAtLabel: formatMatchDateTime(s.scannedAt),
    reference: s.reference,
  }));

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>Contrôle d&rsquo;accès — Abonnements</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--tk-text-muted)", marginBottom: "1.5rem" }}>
        Scannez ou collez le contenu du QR code de l&rsquo;abonnement. Une seule validation est acceptée par jour ;
        l&rsquo;abonnement reste valable pour les prochains matchs de la saison.
      </p>
      <SubscriptionScanner initialScans={rows} />
    </main>
  );
}
