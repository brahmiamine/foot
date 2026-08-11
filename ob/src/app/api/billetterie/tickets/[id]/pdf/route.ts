import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getObTeam } from "@/lib/ob-team";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketPurchaseService } from "@/services/TicketPurchaseService";
import { resolveTicketDisplayInfo } from "@/app/mes-billets/ticketDisplay";
import { formatMatchDateTime } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Billet PDF téléchargeable : logo, match, date, catégorie, titulaire,
 * numéro, QR code, conditions d'accès. Le token n'est jamais stocké en
 * clair (voir lib/ticketToken.ts) — il est redéchiffré ici, à la volée,
 * uniquement après vérification que l'appelant a le droit de voir ce billet
 * (compte MEMBER propriétaire de la commande, ou email de la commande invité).
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
  const token = service.getRawToken(ticket);
  const qrPng = await QRCode.toBuffer(token, { width: 300, margin: 1 });

  const logoPath = path.join(process.cwd(), "public", "images", "crest.png");
  const logoBuffer = await readFile(logoPath).catch(() => null);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A5", margin: 40 });
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  if (logoBuffer) {
    doc.image(logoBuffer, doc.page.width / 2 - 30, 30, { width: 60 });
  }

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(team.nom ?? "Olympique de Béja", 0, 100, { align: "center" });

  doc.moveDown(1);
  doc.fontSize(14).font("Helvetica-Bold").text(info.matchLabel, { align: "center" });
  doc.fontSize(11).font("Helvetica").text(info.matchDate ? formatMatchDateTime(new Date(info.matchDate)) : "Date à confirmer", { align: "center" });

  doc.moveDown(1.5);
  const qrY = doc.y;
  doc.image(qrPng, doc.page.width / 2 - 90, qrY, { width: 180 });
  doc.y = qrY + 190;

  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text(info.categoryName, { align: "center" });
  if (info.holderName) {
    doc.fontSize(11).font("Helvetica").text(info.holderName, { align: "center" });
  }
  doc.fontSize(10).fillColor("#6b7280").text(`Billet ${info.ticketNumber}`, { align: "center" });
  doc.fillColor("black");

  doc.moveDown(2);
  doc
    .fontSize(8)
    .fillColor("#6b7280")
    .text(
      "Ce billet est personnel et non cessible. Présentez-le (imprimé ou sur votre téléphone) au contrôle d'accès du stade. Un billet déjà scanné ou annulé ne sera plus accepté.",
      { align: "center" }
    );

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
