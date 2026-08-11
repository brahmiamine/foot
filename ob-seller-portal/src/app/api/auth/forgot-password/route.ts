import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { SellerUser } from "@/entities/SellerUser";
import { sendEmail } from "@/lib/mailer";
import { handleApiError } from "@/lib/api";

const schema = z.object({ email: z.string().email() });

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());
    const ds = await getDataSource();
    const user = await ds.getRepository(SellerUser).findOne({ where: { email } });

    // Réponse identique que le compte existe ou non : on ne révèle jamais
    // quels emails sont enregistrés.
    const genericResponse = NextResponse.json({
      message: "Si ce compte existe, un email de réinitialisation a été envoyé.",
    });

    if (!user) return genericResponse;

    const token = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await ds.getRepository(SellerUser).save(user);

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: "Réinitialisation de votre mot de passe — Seller Portal OB",
      html: `<p>Bonjour ${user.name},</p><p>Cliquez sur ce lien pour réinitialiser votre mot de passe (valable 1h) :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return genericResponse;
  } catch (error) {
    return handleApiError(error);
  }
}
