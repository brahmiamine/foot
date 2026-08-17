import crypto from "crypto";
import bcrypt from "bcryptjs";
import { IsNull, MoreThan } from "typeorm";
import { AccountInvitation } from "@/entities/AccountInvitation";
import { User } from "@/entities/User";
import { getDataSource } from "./db";
import { sendEmail } from "./mailer";

const SALT_ROUNDS = 12;
const DEFAULT_TTL_HOURS = 48;

export type AccountInvitationErrorCode =
  | "EMAIL_TAKEN"
  | "PLAYER_ALREADY_LINKED"
  | "PLAYER_ACCOUNT_ACTIVE"
  | "INVALID_OR_EXPIRED_INVITATION";

export class AccountInvitationError extends Error {
  constructor(readonly code: AccountInvitationErrorCode, message: string) {
    super(message);
    this.name = "AccountInvitationError";
  }
}

export interface InvitePlayerAccountInput {
  name: string;
  email: string;
  teamId: string;
  playerId: string;
  invitedByUserId?: string | null;
}

export interface InvitePlayerAccountResult {
  userId: string;
  email: string;
  teamId: string;
  playerId: string;
  expiresAt: Date;
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function invitationTtlMs(): number {
  const configured = Number(process.env.ACCOUNT_INVITATION_TTL_HOURS ?? DEFAULT_TTL_HOURS);
  const hours = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_HOURS;
  return hours * 60 * 60 * 1000;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

/**
 * Provisionne (ou réinvite) un compte PLAYER inactif. Le domaine appelant
 * fournit l'identité sportive déjà contrôlée côté serveur ; Identity crée
 * seul le credential placeholder, le jeton et l'email d'activation.
 */
export async function invitePlayerAccount(
  input: InvitePlayerAccountInput,
): Promise<InvitePlayerAccountResult> {
  const email = normalizeEmail(input.email);
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + invitationTtlMs());
  const placeholderPasswordHash = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), SALT_ROUNDS);
  const dataSource = await getDataSource();

  const result = await dataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(User);
    const invitationRepo = manager.getRepository(AccountInvitation);

    const byPlayer = await userRepo.findOne({ where: { playerId: input.playerId } });
    const byEmail = await userRepo.findOne({ where: { email } });

    if (byEmail && (!byPlayer || byEmail.id !== byPlayer.id)) {
      throw new AccountInvitationError("EMAIL_TAKEN", "Un compte existe déjà avec cet email");
    }

    let user = byPlayer;
    if (user) {
      if (user.role !== "PLAYER" || user.teamId !== input.teamId) {
        throw new AccountInvitationError(
          "PLAYER_ALREADY_LINKED",
          "Ce joueur est déjà lié à un autre compte ou club",
        );
      }
      if (user.isActive) {
        throw new AccountInvitationError("PLAYER_ACCOUNT_ACTIVE", "Le compte Player Hub est déjà actif");
      }
      user.name = input.name.trim();
      user.email = email;
      await userRepo.save(user);
    } else {
      user = userRepo.create({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        email,
        password: placeholderPasswordHash,
        role: "PLAYER",
        isActive: false,
        teamId: input.teamId,
        playerId: input.playerId,
        federationId: null,
        leagueId: null,
        tokenVersion: 0,
      });
      user = await userRepo.save(user);
    }

    // Une réinvitation rend tous les anciens liens inutilisables.
    await invitationRepo.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    await invitationRepo.save(
      invitationRepo.create({
        userId: user.id,
        purpose: "PLAYER_ACCOUNT",
        tokenHash,
        expiresAt,
        usedAt: null,
        invitedByUserId: input.invitedByUserId ?? null,
      }),
    );

    return { userId: user.id, email: user.email, teamId: user.teamId!, playerId: user.playerId! };
  });

  const appUrl = (process.env.SSO_URL || "http://localhost:3004").replace(/\/$/, "");
  const activationUrl = `${appUrl}/activate-account?token=${encodeURIComponent(rawToken)}`;
  await sendEmail({
    to: result.email,
    subject: "Activez votre espace joueur",
    html: `
      <p>Bonjour ${escapeHtml(input.name.trim())},</p>
      <p>Votre club vous a invité à activer votre espace joueur.</p>
      <p><a href="${activationUrl}">Activer mon compte</a></p>
      <p>Ce lien est personnel, à usage unique et expire le ${expiresAt.toLocaleString("fr-FR")}.</p>
      <p>Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
    `,
  });

  return { ...result, expiresAt };
}

export type AcceptAccountInvitationResult =
  | { success: true; userId: string; role: User["role"] }
  | { success: false; error: "invalid_or_expired_invitation" };

/** Active atomiquement un compte après choix du mot de passe par l'invité. */
export async function acceptAccountInvitation(
  rawToken: string,
  newPassword: string,
): Promise<AcceptAccountInvitationResult> {
  const tokenHash = hashToken(rawToken);
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const dataSource = await getDataSource();

  return dataSource.transaction(async (manager) => {
    const invitationRepo = manager.getRepository(AccountInvitation);
    const userRepo = manager.getRepository(User);
    const now = new Date();

    const invitation = await invitationRepo.findOne({ where: { tokenHash } });
    if (!invitation || invitation.usedAt || invitation.expiresAt.getTime() <= now.getTime()) {
      return { success: false, error: "invalid_or_expired_invitation" } as const;
    }

    // Compare-and-set : deux requêtes concurrentes ne peuvent pas consommer le même lien.
    const consumption = await invitationRepo.update(
      { id: invitation.id, usedAt: IsNull(), expiresAt: MoreThan(now) },
      { usedAt: now },
    );
    if (consumption.affected !== 1) {
      return { success: false, error: "invalid_or_expired_invitation" } as const;
    }

    const user = await userRepo.findOne({ where: { id: invitation.userId } });
    if (!user || user.isActive || user.role !== "PLAYER") {
      throw new AccountInvitationError(
        "INVALID_OR_EXPIRED_INVITATION",
        "L'invitation ne correspond plus à un compte activable",
      );
    }

    user.password = passwordHash;
    user.isActive = true;
    user.tokenVersion += 1;
    await userRepo.save(user);

    return { success: true, userId: user.id, role: user.role } as const;
  });
}
