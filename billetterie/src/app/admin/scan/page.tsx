import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/adminAuth";
import { buildAdminLoginUrlForPath } from "@/lib/ssoSession";
import { listRecentScans } from "@/lib/tickets";
import { formatMatchDateTime } from "@/lib/format";
import { TicketScanner } from "@/components/admin/TicketScanner";

export const dynamic = "force-dynamic";

/**
 * Scanner de contrôle d'accès (avancement.md, rang 2) : réservé aux rôles
 * ADMIN/SUPERADMIN. Pensé pour une douchette QR/code-barres (clavier
 * virtuel) ou un copier-coller manuel — pas de lecture caméra embarquée
 * dans le navigateur (voir avancement.md pour ce qui reste hors périmètre
 * de cette v1 : mode offline, lecture caméra).
 */
export default async function ScanPage() {
  const authorized = await hasAdminSession();
  if (!authorized) {
    redirect(await buildAdminLoginUrlForPath("/admin/scan"));
  }

  const scans = await listRecentScans();
  const rows = scans.map((s) => ({
    id: s.id,
    result: s.result,
    scannedBy: s.scannedBy,
    scannedAtLabel: formatMatchDateTime(s.scannedAt),
    reference: s.reference,
  }));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>Contrôle d&rsquo;accès</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--tk-text-muted)", marginBottom: "1.5rem" }}>
        Scannez ou collez le contenu du QR code du billet. Le nom des équipes et la catégorie
        s&rsquo;affichent après chaque scan valide : vérifiez-les visuellement avant de laisser
        entrer le porteur.
      </p>
      <TicketScanner initialScans={rows} />
    </main>
  );
}
