import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDataSource } from "./db";
import { User } from "@/entities/User";
import { ClubInvitation } from "@/entities/ClubInvitation";
import { sendEmail } from "./mailer";
import type { SsoUser } from "./session";

// Plus long que le mot de passe oublié (1h, voir passwordReset.ts) : une
// invitation n'est pas aussi sensible dans le temps qu'une réinitialisation
// déclenchée par le titulaire du compte lui-même, et la personne invitée
// n'a pas forcément de compte email surveillé en permanence.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const MIN_PASSWORD_LENGTH = 8;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toSsoUser(user: User): SsoUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId ?? null,
    tokenVersion: user.tokenVersion,
  };
}

export type CreateInvitationResult =
  | { ok: true }
  | { ok: false; error: "email_taken" };

/**
 * Déclenche une invitation club (voir ClubInvitation) : jeton à usage
 * unique stocké hashé, jamais en clair — même principe que
 * `passwordReset.ts`. L'autorisation (qui a le droit d'inviter quel rôle,
 * sur quel club) est vérifiée par l'appelant (route API), pas ici : cette
 * fonction fait confiance à `teamId`/`role` reçus.
 */
export async function createClubInvitation(params: {
  email: string;
  teamId: string;
  role: "ADMIN" | "OBSERVATEUR";
  invitedByUserId: string;
}): Promise<CreateInvitationResult> {
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const invitationRepo = dataSource.getRepository(ClubInvitation);

  const normalizedEmail = normalizeEmail(params.email);

  // Même logique que UserService.create (teamManager) et createMemberAccount
  // (sso) : un email déjà utilisé par un compte ne doit jamais pouvoir être
  // ré-invité (créerait un conflit à la redemption, `User.email` est unique).
  const existing = await userRepo.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    return { ok: false, error: "email_taken" };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const invitation = invitationRepo.create({
    email: normalizedEmail,
    teamId: params.teamId,
    role: params.role,
    invitedByUserId: params.invitedByUserId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  await invitationRepo.save(invitation);

  const appUrl = process.env.SSO_URL || "http://localhost:3004";
  const inviteUrl = `${appUrl}/invitation?token=${rawToken}`;

  await sendEmail({
    to: normalizedEmail,
    subject: "Invitation à rejoindre votre club",
    html: `
      <p>Bonjour,</p>
      <p>Vous avez été invité(e) à rejoindre l'espace de gestion de votre club.</p>
      <p><a href="${inviteUrl}">Créer mon compte</a></p>
      <p>Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
    `,
  });

  return { ok: true };
}

export type AcceptInvitationResult =
  | { ok: true; user: SsoUser }
  | { ok: false; error: "invalid_or_expired_token" | "invalid" | "email_taken" };

/**
 * Ouverture du lien d'invitation : la personne choisit elle-même son nom et
 * son mot de passe, le compte `User` est créé avec le `teamId`/`role` fixés
 * à l'invitation (jamais choisis par l'invité·e), puis l'invitation est
 * marquée consommée pour ne jamais pouvoir être rejouée — même principe que
 * `resetPassword()`.
 */
export async function acceptClubInvitation(
  rawToken: string,
  name: string,
  password: string
): Promise<AcceptInvitationResult> {
  if (!name.trim() || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "invalid" };
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const invitationRepo = dataSource.getRepository(ClubInvitation);

  const invitation = await invitationRepo.findOne({ where: { tokenHash: hashToken(rawToken) } });
  const isExpired = !invitation || new Date(invitation.expiresAt).getTime() < Date.now();
  if (!invitation || invitation.consumedAt || isExpired) {
    return { ok: false, error: "invalid_or_expired_token" };
  }

  // Vérifié à nouveau ici (déjà vérifié à la création de l'invitation) : un
  // compte a pu être créé entre-temps avec ce même email (ex. deux
  // invitations envoyées, ou inscription libre membre entre-temps).
  const existing = await userRepo.findOne({ where: { email: invitation.email } });
  if (existing) {
    return { ok: false, error: "email_taken" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = userRepo.create({
    id: crypto.randomUUID(),
    name: name.trim(),
    email: invitation.email,
    password: hashedPassword,
    role: invitation.role,
    isActive: true,
    teamId: invitation.teamId,
  });
  await userRepo.save(user);

  invitation.consumedAt = new Date();
  await invitationRepo.save(invitation);

  return { ok: true, user: toSsoUser(user) };
}
