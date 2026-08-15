import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { CompetitionRegistration } from "@/entities/Regulatory";
import { getPaymentProvider, initPayment } from "@/lib/paymentApiClient";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ds = await getDataSource();
    const entryRepo = ds.getRepository(CompetitionRegistration);
    const entry = await entryRepo.findOne({ where: { id, clubId: session.user.teamId } });
    if (!entry) return NextResponse.json({ error: "Engagement introuvable" }, { status: 404 });
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(entry.status)) {
      return NextResponse.json(
        { error: "Le paiement ne peut être initié que sur un engagement modifiable" },
        { status: 409 },
      );
    }

    const seasonRows = (await ds.query(
      "SELECT competition_entry_fee FROM saisons WHERE id = ? LIMIT 1",
      [entry.seasonId],
    )) as Array<{ competition_entry_fee?: string | number | null }>;
    if (seasonRows.length === 0) {
      return NextResponse.json({ error: "Saison introuvable" }, { status: 404 });
    }

    const amount = Number(entry.feesAmount ?? seasonRows[0].competition_entry_fee ?? 0);
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Aucun droit d'engagement n'est dû" }, { status: 409 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const payment = await initPayment({
      orderId: `competition-entry:${id}`,
      amount,
      email: session.user.email ?? undefined,
      userId: session.user.id,
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      phoneNumber: typeof body.phoneNumber === "string" ? body.phoneNumber : undefined,
    });

    entry.feesAmount = amount.toFixed(3);
    entry.feesPaymentId = payment.paymentId;
    await entryRepo.save(entry);

    return NextResponse.json({
      paymentId: payment.paymentId,
      redirectUrl: payment.payUrl,
      provider: getPaymentProvider(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 },
    );
  }
}
