import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { SellerUser } from "@/entities/SellerUser";
import { hashPassword } from "@/lib/password";
import { handleApiError } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const ds = await getDataSource();
    const user = await ds.getRepository(SellerUser).findOne({ where: { email: body.email } });

    const invalid = () => NextResponse.json({ error: "Lien de réinitialisation invalide ou expiré." }, { status: 400 });

    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) return invalid();
    if (user.passwordResetExpiresAt.getTime() < Date.now()) return invalid();

    const tokenHash = createHash("sha256").update(body.token).digest("hex");
    if (tokenHash !== user.passwordResetTokenHash) return invalid();

    user.passwordHash = await hashPassword(body.password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await ds.getRepository(SellerUser).save(user);

    return NextResponse.json({ message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
  } catch (error) {
    return handleApiError(error);
  }
}
