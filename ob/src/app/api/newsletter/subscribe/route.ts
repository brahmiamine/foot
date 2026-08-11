import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObNewsletterSubscriber } from "@/entities/ObNewsletterSubscriber";
import { getSsoSession } from "@/lib/ssoSession";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const session = await getSsoSession();
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObNewsletterSubscriber);

  const existing = await repository.findOne({ where: { email } });
  if (existing) {
    if (existing.unsubscribedAt) {
      existing.unsubscribedAt = null;
      await repository.save(existing);
    }
    return NextResponse.json({ success: true });
  }

  await repository.save(
    repository.create({
      email,
      userId: session?.id ?? null,
      unsubscribeToken: randomBytes(24).toString("hex"),
    })
  );

  return NextResponse.json({ success: true });
}
