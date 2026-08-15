import { NextRequest, NextResponse } from "next/server";
import { In } from "typeorm";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";

/** GET /api/exports/players — export Excel/PDF avec historique disciplinaire. */
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

  const playerIds = players.map((player) => player.id);
  const [cards, activeSuspensions] = playerIds.length
    ? await Promise.all([
        dataSource.getRepository(Card).find({ where: { playerId: In(playerIds) } }),
        dataSource.getRepository(Suspension).find({
          select: { playerId: true },
          where: { playerId: In(playerIds), status: "ACTIVE" },
        }),
      ])
    : [[], []];

  const cardCounts = new Map<string, { yellow: number; red: number }>();
  for (const card of cards) {
    const current = cardCounts.get(card.playerId) ?? { yellow: 0, red: 0 };
    if (card.type === "YELLOW") current.yellow += 1;
    else current.red += 1;
    cardCounts.set(card.playerId, current);
  }

  const activeSuspensionCounts = new Map<string, number>();
  for (const suspension of activeSuspensions) {
    if (!suspension.playerId) continue;
    activeSuspensionCounts.set(
      suspension.playerId,
      (activeSuspensionCounts.get(suspension.playerId) ?? 0) + 1,
    );
  }

  const rows = players.map((player) => {
    const counts = cardCounts.get(player.id) ?? { yellow: 0, red: 0 };
    return {
      Numéro: player.number,
      Prénom: player.firstNameFr,
      Nom: player.lastNameFr,
      "Prénom AR": player.firstNameAr ?? "",
      "Nom AR": player.lastNameAr ?? "",
      Équipe: player.team?.nom ?? "",
      Statut: player.status,
      "Cartons Jaunes": counts.yellow,
      "Cartons Rouges": counts.red,
      "Suspensions actives": activeSuspensionCounts.get(player.id) ?? 0,
    };
  });

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
