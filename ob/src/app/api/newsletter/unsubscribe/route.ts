import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObNewsletterSubscriber } from "@/entities/ObNewsletterSubscriber";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObNewsletterSubscriber);
  const subscriber = await repository.findOne({ where: { unsubscribeToken: token } });
  if (!subscriber) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  subscriber.unsubscribedAt = new Date();
  await repository.save(subscriber);

  return NextResponse.redirect(new URL("/newsletter?desabonne=1", request.url));
}
