import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObNotificationPrefs } from "@/entities/ObNotificationPrefs";
import { requireMember } from "@/lib/community/requireMember";

export const runtime = "nodejs";

const KEYS = ["matches", "results", "news", "womenTeam", "youth", "favoritePlayers", "shop", "ticketing"] as const;

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObNotificationPrefs);

  const existing = await repository.findOne({ where: { userId: auth.data.session.id } });
  const row = existing ?? repository.create({ userId: auth.data.session.id });
  for (const key of KEYS) {
    if (key in body) {
      row[key] = !!body[key];
    }
  }
  await repository.save(row);

  return NextResponse.json({ success: true });
}
