import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDataSource } from "./db";
import { User } from "@/entities/User";
import { PasswordResetToken } from "@/entities/PasswordResetToken";
import { sendEmail } from "./mailer";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Ne renvoie jamais d'information sur l'existence du compte (anti-
 * énumération) : le caller (route API) répond toujours le même message
 * générique, que l'email corresponde à un compte ou non.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const tokenRepo = dataSource.getRepository(PasswordResetToken);

  const user = await userRepo.findOne({ where: { email } });
  if (!user || !user.isActive) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const resetToken = tokenRepo.create({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  await tokenRepo.save(resetToken);

  const appUrl = process.env.SSO_URL || "http://localhost:3004";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <p>Bonjour ${user.name},</p>
      <p>Une demande de réinitialisation de mot de passe a été effectuée pour ce compte.</p>
      <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
    `,
  });
}

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: "invalid_or_expired_token" | "account_inactive" };

export async function resetPassword(rawToken: string, newPassword: string): Promise<ResetPasswordResult> {
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const tokenRepo = dataSource.getRepository(PasswordResetToken);

  const resetToken = await tokenRepo.findOne({ where: { tokenHash: hashToken(rawToken) } });
  const isExpired = !resetToken || new Date(resetToken.expiresAt).getTime() < Date.now();
  if (!resetToken || resetToken.usedAt || isExpired) {
    return { success: false, error: "invalid_or_expired_token" };
  }

  const user = await userRepo.findOne({ where: { id: resetToken.userId } });
  if (!user || !user.isActive) {
    return { success: false, error: "account_inactive" };
  }

  user.password = await bcrypt.hash(newPassword, 12);
  // Invalide toute session déjà émise (voir User.tokenVersion) : un
  // attaquant ayant volé une session avant que le titulaire ne réinitialise
  // son mot de passe ne doit pas pouvoir continuer à l'utiliser après.
  user.tokenVersion += 1;
  await userRepo.save(user);

  resetToken.usedAt = new Date();
  await tokenRepo.save(resetToken);

  return { success: true };
}

export type ChangePasswordResult =
  | { success: true; user: User }
  | { success: false; error: "invalid_current_password" | "account_inactive" };

/**
 * Changement de mot de passe pour un compte déjà connecté (portail, `/account/password`)
 * — distinct de resetPassword (lien email, compte non connecté). Exige le
 * mot de passe actuel : une session volée ne suffit pas à en prendre le
 * contrôle définitif. La longueur du nouveau mot de passe est validée par
 * l'appelant (voir reset-password/route.ts pour la même convention). Comme
 * resetPassword, incrémente tokenVersion (voir User.tokenVersion) — le
 * caller doit réémettre une session à jour pour ne pas déconnecter
 * l'utilisateur qui vient de faire l'action.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user || !user.isActive) {
    return { success: false, error: "account_inactive" };
  }

  const currentValid = await bcrypt.compare(currentPassword, user.password);
  if (!currentValid) {
    return { success: false, error: "invalid_current_password" };
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1;
  await userRepo.save(user);

  return { success: true, user };
}
