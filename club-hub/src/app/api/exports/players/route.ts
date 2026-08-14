import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";

/**
 * GET /api/exports/players — export Excel/PDF de la liste des joueurs du
 * club avec leur historique disciplinaire. Port de cardManager/app/api/exports/players.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "excel";

  const dataSource = await getDataSource();
  const players = await dataSource.getRepository(Player).find({
    where: { isActive: true, teamId: session.user.teamId },
    relations: { team: true },
    order: { lastNameFr: "ASC" },
  });

  const cardRepo = dataSource.getRepository(Card);
  const suspensionRepo = dataSource.getRepository(Suspension);

  const rows = await Promise.all(
    players.map(async (p) => {
      const cards = await cardRepo.find({ where: { playerId: p.id } });
      const activeSuspensions = await suspensionRepo.count({ where: { playerId: p.id, status: "ACTIVE" } });
      return {
        Numéro: p.number,
        Prénom: p.firstNameFr,
        Nom: p.lastNameFr,
        "Prénom AR": p.firstNameAr ?? "",
        "Nom AR": p.lastNameAr ?? "",
        Équipe: p.team?.nom ?? "",
        Statut: p.status,
        "Cartons Jaunes": cards.filter((c) => c.type === "YELLOW").length,
        "Cartons Rouges": cards.filter((c) => c.type !== "YELLOW").length,
        "Suspensions actives": activeSuspensions,
      };
    })
  );

  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Joueurs");
    if (rows.length > 0) {
      sheet.addRow(Object.keys(rows[0]));
      rows.forEach((row) => sheet.addRow(Object.values(row)));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="joueurs.xlsx"',
      },
    });
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.text("Liste des Joueurs", 14, 15);
  autoTable(doc, {
    head: [Object.keys(rows[0] ?? {})],
    body: rows.map(Object.values),
    startY: 20,
  });
  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="joueurs.pdf"',
    },
  });
}
