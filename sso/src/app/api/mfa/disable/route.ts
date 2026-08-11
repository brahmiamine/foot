import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentSession } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";

export const runtime = "nodejs";

/** Exige le mot de passe (pas seulement la session active) pour désactiver la MFA. */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaRecoveryCodes = null;
  await userRepo.save(user);

  console.log(`[MFA] Désactivée pour le compte ${user.email} (${user.id}).`);

  return NextResponse.json({ success: true });
}
