import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SponsorService } from "@/services/SponsorService";
import { getClubBranding } from "@/lib/clubBranding";
import type { SponsorLevel, SponsorLogoSize } from "@/entities/SponsorRequest";

/**
 * GET /api/exports/sponsor-contract/[id] — génère un résumé de convention
 * de partenariat en PDF à partir d'un dossier Sponsor déjà accepté (niveau,
 * emplacement du logo, durée, montant). Même pattern serveur que les autres
 * exports (jsPDF/jspdf-autotable, voir api/exports/fines/route.ts).
 *
 * Ce n'est PAS un contrat juridiquement relu par un avocat : un résumé
 * administratif des termes déjà saisis dans club-hub, à faire valider
 * par le club avant signature — voir club-hub/README.md.
 */

const LEVEL_LABELS: Record<SponsorLevel, string> = { OR: "Or", ARGENT: "Argent", BRONZE: "Bronze", LOCAL: "Local" };
const LOGO_SIZE_LABELS: Record<SponsorLogoSize, string> = { SMALL: "Petit", MEDIUM: "Moyen", LARGE: "Grand" };
const PLACEMENT_LABELS: Record<string, string> = {
  HOME: "Page d'accueil",
  FOOTER: "Pied de page",
  MATCH_PAGES: "Pages matchs",
  SHOP: "Boutique",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-TN");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.teamId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sponsorId = Number(id);
  if (!Number.isInteger(sponsorId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const sponsorService = new SponsorService();
  const sponsor = await sponsorService.findSponsorById(sponsorId, session.user.teamId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor introuvable" }, { status: 404 });
  }

  const branding = await getClubBranding(session.user.teamId);

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Convention de partenariat", 14, 18);
  doc.setFontSize(11);
  doc.text(`${branding.name} — ${sponsor.companyName}`, 14, 26);

  autoTable(doc, {
    startY: 34,
    head: [["Terme", "Détail"]],
    body: [
      ["Club", branding.name],
      ["Sponsor", sponsor.companyName],
      ["Site web", sponsor.website || "—"],
      ["Niveau de partenariat", LEVEL_LABELS[sponsor.level]],
      ["Taille du logo", LOGO_SIZE_LABELS[sponsor.logoSize]],
      [
        "Emplacements du logo",
        (sponsor.logoPlacement || "")
          .split(",")
          .filter(Boolean)
          .map((code) => PLACEMENT_LABELS[code] ?? code)
          .join(", ") || "—",
      ],
      ["Début du contrat", formatDate(sponsor.contractStart)],
      ["Fin du contrat", formatDate(sponsor.contractEnd)],
      ["Montant", sponsor.contractAmount ? `${Number(sponsor.contractAmount).toFixed(3)} DT` : "—"],
    ],
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Document généré automatiquement à partir des informations saisies dans club-hub — résumé administratif,",
    14,
    finalY + 12,
  );
  doc.text("pas un contrat juridiquement relu : à faire valider par le club avant toute signature.", 14, finalY + 17);
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.text("Pour le club", 14, finalY + 35);
  doc.line(14, finalY + 50, 90, finalY + 50);
  doc.text("Pour le sponsor", 120, finalY + 35);
  doc.line(120, finalY + 50, 196, finalY + 50);

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `convention-${sponsor.companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
