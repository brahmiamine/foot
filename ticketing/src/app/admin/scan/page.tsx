import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/adminAuth";
import { buildAdminLoginUrlForPath } from "@/lib/ssoSession";
import { listOpenMatches, listRecentScans } from "@/lib/tickets";
import { formatMatchDateTime } from "@/lib/format";
import { TicketScanner } from "@/components/admin/TicketScanner";

export const dynamic = "force-dynamic";

/**
 * Scanner de contrôle d'accès (avancement.md, rang 2) : réservé aux rôles
 * ADMIN/SUPERADMIN. Trois façons de nourrir le scan : douchette QR/code-
 * barres (clavier virtuel), collage manuel, ou caméra du navigateur
 * (`CameraScanner`). Le mode hors-ligne (liste de billets pré-téléchargée,
 * scans mis en file puis synchronisés) reste optionnel — voir
 * TicketScanner pour le détail des deux.
 */
export default async function ScanPage() {
  const authorized = await hasAdminSession();
  if (!authorized) {
    redirect(await buildAdminLoginUrlForPath("/admin/scan"));
  }

  const [scans, matches] = await Promise.all([listRecentScans(), listOpenMatches()]);
  const rows = scans.map((s) => ({
    id: s.id,
    result: s.result,
    scannedBy: s.scannedBy,
    scannedAtLabel: formatMatchDateTime(s.scannedAt),
    reference: s.reference,
  }));
  const openMatches = matches.map((m) => ({
    id: m.id,
    label: `${m.homeTeamName} - ${m.awayTeamName}${m.date ? ` · ${formatMatchDateTime(m.date)}` : ""}`,
  }));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>Contrôle d&rsquo;accès</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--tk-text-muted)", marginBottom: "1.5rem" }}>
        Scannez ou collez le contenu du QR code du billet, ou utilisez la caméra. Le nom des
        équipes et la catégorie s&rsquo;affichent après chaque scan valide : vérifiez-les
        visuellement avant de laisser entrer le porteur.
      </p>
      <TicketScanner initialScans={rows} openMatches={openMatches} />
    </main>
  );
}
