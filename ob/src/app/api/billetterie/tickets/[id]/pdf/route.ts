import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getObTeam } from "@/lib/ob-team";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketPurchaseService } from "@/services/TicketPurchaseService";
import { PublicStadiumService } from "@/services/PublicStadiumService";
import { resolveTicketDisplayInfo } from "@/app/mes-billets/ticketDisplay";
import { formatMatchDateTime } from "@/lib/format";

export const runtime = "nodejs";

const OB_RED = "#c8102e";
const OB_RED_DARK = "#7a0c1e";
const OB_RED_PALE = "#ffe0e4";
const TEXT_MUTED = "#6b7280";

/** "2025/2026" — saison football (bascule au 1er juillet). */
function seasonLabel(date: Date | null): string {
  const ref = date ?? new Date();
  const startYear = ref.getMonth() >= 6 ? ref.getFullYear() : ref.getFullYear() - 1;
  return `SAISON ${startYear}/${startYear + 1}`;
}

/**
 * Billet PDF téléchargeable, inspiré des billets de club officiels
 * (bandeau couleur club, encart infos + QR, bloc match, encart accès,
 * conditions) : logo, match, date, catégorie, titulaire, numéro, QR code,
 * conditions d'accès. Le token n'est jamais stocké en clair (voir
 * lib/ticketToken.ts) — il est redéchiffré ici, à la volée, uniquement
 * après vérification que l'appelant a le droit de voir ce billet (compte
 * MEMBER propriétaire de la commande, ou email de la commande invité).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const ticketId = parseInt(idParam, 10);
  if (Number.isNaN(ticketId)) {
    return NextResponse.json({ error: "Billet invalide" }, { status: 400 });
  }

  const team = await getObTeam();
  if (!team) return NextResponse.json({ error: "Club non configuré" }, { status: 500 });

  const service = new TicketPurchaseService();
  const ticket = await service.getTicketById(ticketId, team.id);
  if (!ticket) return NextResponse.json({ error: "Billet introuvable" }, { status: 404 });

  const session = await getSsoSession();
  const email = request.nextUrl.searchParams.get("email");
  const authorized = await service.canAccessTicket(ticket, { userId: session?.role === "MEMBER" ? session.id : null, email });
  if (!authorized) {
    return NextResponse.json({ error: "Accès non autorisé à ce billet" }, { status: 403 });
  }

  if (ticket.status !== "ISSUED" && ticket.status !== "USED") {
    return NextResponse.json({ error: "Ce billet n'est plus disponible au téléchargement" }, { status: 410 });
  }

  const [info] = await resolveTicketDisplayInfo([ticket], team.id);
  const stadium = await new PublicStadiumService().getHomeStadium(team.id);
  const token = service.getRawToken(ticket);
  const qrPng = await QRCode.toBuffer(token, { width: 300, margin: 0, color: { dark: "#000000", light: "#ffffff" } });

  const logoPath = path.join(process.cwd(), "public", "images", "crest.png");
  const logoBuffer = await readFile(logoPath).catch(() => null);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A5", margin: 0 });
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const W = doc.page.width;
  const M = 24;

  // --- Bandeau 1 : logo + club + statut domicile/extérieur ---------------
  doc.rect(0, 0, W, 84).fill(OB_RED);
  if (logoBuffer) {
    doc.image(logoBuffer, M, 14, { width: 56 });
  }
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(team.nom ?? "Olympique de Béja", M + 66, 24, { width: W - M - 66 - M });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(info.isHome ? "MATCH À DOMICILE" : "MATCH À L'EXTÉRIEUR", M + 66, 48, { width: W - M - 66 - M });
  if (stadium) {
    doc.fontSize(8).text([stadium.nameFr, stadium.cityFr].filter(Boolean).join(", "), M + 66, 62, { width: W - M - 66 - M });
  }

  // --- Bandeau 2 : saison / catégorie / repère billet ---------------------
  doc.rect(0, 84, W, 22).fill(OB_RED_DARK);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
  doc.text(seasonLabel(info.matchDate ? new Date(info.matchDate) : null), M, 91, { width: 140, align: "left" });
  doc.text(info.categoryName.toUpperCase(), 140, 91, { width: W - 280, align: "center" });
  doc.text("BILLET OB", W - M - 140, 91, { width: 140, align: "right" });

  // --- Encart infos + QR ---------------------------------------------------
  let y = 118;
  const infoWidth = W - 2 * M - 140;
  doc.fillColor("#111111").font("Helvetica").fontSize(10);
  doc.text(`Nom : ${info.holderName || "—"}`, M, y, { width: infoWidth });
  y += 16;
  doc.text(`Tarif : ${info.categoryPrice > 0 ? `${info.categoryPrice.toFixed(3)} DT` : "Offre gratuite — 0.000 DT"}`, M, y, { width: infoWidth });
  y += 18;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(OB_RED).text(info.categoryName, M, y, { width: infoWidth });
  y += 20;
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111111")
    .text(info.matchDate ? formatMatchDateTime(new Date(info.matchDate)) : "Date à confirmer", M, y, { width: infoWidth });

  doc.image(qrPng, W - M - 120, 118, { width: 120 });
  doc.font("Helvetica").fontSize(7).fillColor(TEXT_MUTED).text(info.ticketNumber, W - M - 120, 240, { width: 120, align: "center" });

  // --- Bloc match ------------------------------------------------------------
  y = 270;
  const obLabel = team.nom ?? "Olympique de Béja";
  const [homeLabel, awayLabel] = info.isHome ? [obLabel, info.opponentName] : [info.opponentName, obLabel];
  doc.font("Helvetica-Bold").fontSize(17).fillColor("#111111").text(homeLabel, M, y, { width: W - 2 * M, align: "center" });
  y += 24;
  doc.font("Helvetica").fontSize(11).fillColor(TEXT_MUTED).text("vs", M, y, { width: W - 2 * M, align: "center" });
  y += 16;
  doc.font("Helvetica-Bold").fontSize(17).fillColor("#111111").text(awayLabel, M, y, { width: W - 2 * M, align: "center" });

  // --- Encart accès (numéro de billet / statut) -------------------------------
  y += 40;
  const boxHeight = 30;
  doc.lineWidth(1);
  doc.roundedRect(M, y, W - 2 * M, boxHeight, 4).fillAndStroke(OB_RED_PALE, OB_RED);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(OB_RED_DARK)
    .text(`Billet N° ${info.ticketNumber}`, M, y + boxHeight / 2 - 6, { width: W - 2 * M, align: "center" });

  // --- Conditions d'accès ------------------------------------------------------
  y += boxHeight + 26;
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#111111")
    .text("Conditions d'accès", M, y, { width: W - 2 * M });
  y += 12;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(TEXT_MUTED)
    .text(
      "Ce billet est personnel et non cessible. L'acquisition de ce billet emporte adhésion sans réserve au règlement du stade. Présentez-le, imprimé ou sur votre téléphone, au contrôle d'accès. Un billet déjà scanné ou annulé sera automatiquement refusé à l'entrée. Le club se réserve le droit de refuser l'accès à toute personne représentant un risque pour la sécurité du public.",
      M,
      y,
      { width: W - 2 * M, align: "justify" }
    );

  // --- Bandeau pied de page ----------------------------------------------------
  const footerHeight = 26;
  doc.rect(0, doc.page.height - footerHeight, W, footerHeight).fill(OB_RED);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text("OLYMPIQUE DE BÉJA — LES CIGOGNES", 0, doc.page.height - footerHeight + 8, { width: W, align: "center" });

  doc.end();
  const pdfBuffer = await done;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="billet-${info.ticketNumber}.pdf"`,
    },
  });
}
