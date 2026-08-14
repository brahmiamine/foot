import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { SellerUser } from "@/entities/SellerUser";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireSellerSession } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSellerSession();
    const body = schema.parse(await req.json());

    const ds = await getDataSource();
    const repo = ds.getRepository(SellerUser);
    const user = await repo.findOne({ where: { id: session.sellerUserId } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }

    user.passwordHash = await hashPassword(body.newPassword);
    await repo.save(user);

    return NextResponse.json({ message: "Mot de passe changé avec succès." });
  } catch (error) {
    return handleApiError(error);
  }
}
