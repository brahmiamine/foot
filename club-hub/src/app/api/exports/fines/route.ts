import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { FineService } from "@/services/FineService";

/**
 * GET /api/exports/fines — export Excel/PDF du récapitulatif des amendes du club.
 * Port de cardManager/app/api/exports/fines.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "excel";

  const fineService = new FineService();
  const fines = await fineService.findAllByTeam(session.user.teamId);

  const rows = fines.map((f) => ({
    Type: f.type,
    Motif: f.reasonFr,
    "Montant (DT)": Number(f.amount).toFixed(3),
    Joueur: f.player ? `${f.player.firstNameFr} ${f.player.lastNameFr}` : (f.directorNameFr ?? "—"),
    Statut: f.status,
    Échéance: f.dueDate ? new Date(f.dueDate).toLocaleDateString("fr-TN") : "—",
    "Date paiement": f.paidAt ? new Date(f.paidAt).toLocaleDateString("fr-TN") : "—",
  }));

  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Amendes");
    if (rows.length > 0) {
      sheet.addRow(Object.keys(rows[0]));
      rows.forEach((row) => sheet.addRow(Object.values(row)));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="amendes.xlsx"',
      },
    });
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text("Récapitulatif Amendes", 14, 15);
  autoTable(doc, {
    head: [Object.keys(rows[0] ?? {})],
    body: rows.map(Object.values),
    startY: 20,
  });
  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="amendes.pdf"',
    },
  });
}
