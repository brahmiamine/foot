import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CardService } from "@/services/CardService";

/**
 * GET /api/exports/cards — export Excel/PDF de l'historique des cartons du club.
 * Port de cardManager/app/api/exports/cards.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "excel";

  const cardService = new CardService();
  const cards = await cardService.findAllByTeam(session.user.teamId);

  const rows = cards.map((c) => ({
    Type: c.type,
    Numéro: c.player?.number ?? "",
    Prénom: c.player?.firstNameFr ?? "",
    Nom: c.player?.lastNameFr ?? "",
    Match: `J${c.match?.matchday?.number ?? "?"} — ${c.match?.homeTeam?.nom ?? ""} vs ${c.match?.awayTeam?.nom ?? ""}`,
    Minute: c.minute ?? "—",
    Commentaire: c.commentFr ?? "",
    Date: new Date(c.createdAt).toLocaleDateString("fr-TN"),
  }));

  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Cartons");
    if (rows.length > 0) {
      sheet.addRow(Object.keys(rows[0]));
      rows.forEach((row) => sheet.addRow(Object.values(row)));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="cartons.xlsx"',
      },
    });
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text("Historique des Cartons", 14, 15);
  autoTable(doc, {
    head: [Object.keys(rows[0] ?? {})],
    body: rows.map(Object.values),
    startY: 20,
  });
  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="cartons.pdf"',
    },
  });
}
