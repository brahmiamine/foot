import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SuspensionService } from "@/services/SuspensionService";

/**
 * GET /api/exports/suspensions — export Excel/PDF des suspensions actives du club.
 * Port de cardManager/app/api/exports/suspensions.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "excel";

  const suspensionService = new SuspensionService();
  const allSuspensions = await suspensionService.findAllByTeam(session.user.teamId);
  const suspensions = allSuspensions.filter((s) => s.status === "ACTIVE");

  const rows = suspensions.map((s) => ({
    Numéro: s.player?.number ?? "",
    Prénom: s.player?.firstNameFr ?? "",
    Nom: s.player?.lastNameFr ?? "",
    Équipe: s.team?.nom ?? "",
    Motif: s.reason,
    "Matchs total": s.matchesCount,
    "Matchs purgés": s.matchesPurged,
    "Matchs restants": s.matchesCount - s.matchesPurged,
  }));

  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Suspensions");
    if (rows.length > 0) {
      sheet.addRow(Object.keys(rows[0]));
      rows.forEach((row) => sheet.addRow(Object.values(row)));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="suspensions.xlsx"',
      },
    });
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.text("Suspensions Actives", 14, 15);
  autoTable(doc, {
    head: [Object.keys(rows[0] ?? {})],
    body: rows.map(Object.values),
    startY: 20,
  });
  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="suspensions.pdf"',
    },
  });
}
