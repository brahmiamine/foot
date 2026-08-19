import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { In } from "typeorm";
import { MemberRegistrationRequest } from "@/entities/MemberRegistrationRequest";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { User } from "@/entities/User";
import { getDataSource } from "./db";
import { sendEmail } from "./mailer";
import type { SsoUser } from "./session";
import {
  decideMemberRegistration,
  getMemberRegistrationPolicy,
  type MemberRegistrationMode,
} from "./memberRegistrationPolicy";

const SALT_ROUNDS = 12;
const TOKEN_TTL_HOURS = 48;

export type MemberRegistrationErrorCode =
  | "INVALID"
  | "EMAIL_TAKEN"
  | "REGISTRATION_CLOSED"
  | "INVITATION_REQUIRED"
  | "INVALID_INVITATION"
  | "INVALID_OR_EXPIRED_TOKEN"
  | "INVALID_REQUEST";

export class MemberRegistrationError extends Error {
  constructor(readonly code: MemberRegistrationErrorCode, message: string) {
    super(message);
    this.name = "MemberRegistrationError";
  }
}

export type MemberRegistrationResult =
  | { status: "ACTIVE"; user: SsoUser; affiliationCreated: boolean }
  | { status: "PENDING_EMAIL_VERIFICATION"; requestId: string }
  | { status: "PENDING_CLUB_APPROVAL"; requestId: string };

export interface PasswordMemberRegistrationInput {
  teamId: string;
  name: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  invitationToken?: string | null;
}

export interface GoogleMemberRegistrationInput {
  teamId: string;
  email: string;
  name: string;
  invitationToken?: string | null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function expiry(): Date {
  const configured = Number(process.env.MEMBER_REGISTRATION_TOKEN_TTL_HOURS ?? TOKEN_TTL_HOURS);
  const hours = Number.isFinite(configured) && configured > 0 ? configured : TOKEN_TTL_HOURS;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
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

async function findValidInvitation(teamId: string, email: string, rawToken?: string | null) {
  if (!rawToken) return null;
  const repository = (await getDataSource()).getRepository(MemberRegistrationRequest);
  const request = await repository.findOne({ where: { tokenHash: hashToken(rawToken) } });
  if (
    !request ||
    request.status !== "INVITED" ||
    request.teamId !== teamId ||
    normalizeEmail(request.email) !== normalizeEmail(email) ||
    !request.expiresAt ||
    request.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }
  return request;
}

async function createOrAffilitateMember(input: {
  teamId: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  allowExistingMember: boolean;
  invitationRequestId?: string | null;
}): Promise<{ user: SsoUser; affiliationCreated: boolean }> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const userRepository = manager.getRepository(User);
    const affiliationRepository = manager.getRepository(MemberTeamAffiliation);
    const requestRepository = manager.getRepository(MemberRegistrationRequest);
    const email = normalizeEmail(input.email);
    let user = await userRepository.findOne({ where: { email } });

    if (user && user.role !== "MEMBER") {
      throw new MemberRegistrationError("EMAIL_TAKEN", "Cet email appartient déjà à un compte interne");
    }
    if (user && !input.allowExistingMember) {
      throw new MemberRegistrationError("EMAIL_TAKEN", "Un compte existe déjà avec cet email");
    }

    if (!user) {
      const passwordHash =
        input.passwordHash ??
        (await bcrypt.hash(crypto.randomBytes(48).toString("hex"), SALT_ROUNDS));
      user = await userRepository.save(
        userRepository.create({
          id: crypto.randomUUID(),
          name: input.name.trim() || email,
          email,
          password: passwordHash,
          role: "MEMBER",
          isActive: true,
          teamId: null,
          firstName: input.firstName?.trim() || null,
          lastName: input.lastName?.trim() || null,
          phoneNumber: input.phoneNumber?.trim() || null,
          tokenVersion: 0,
          federationId: null,
          leagueId: null,
          playerId: null,
        }),
      );
    }

    const existingAffiliation = await affiliationRepository.findOne({
      where: { userId: user.id, teamId: input.teamId },
    });
    if (!existingAffiliation) {
      await affiliationRepository.save(
        affiliationRepository.create({ userId: user.id, teamId: input.teamId }),
      );
    }

    if (input.invitationRequestId) {
      const invitation = await requestRepository.findOne({ where: { id: input.invitationRequestId } });
      if (!invitation || invitation.status !== "INVITED") {
        throw new MemberRegistrationError("INVALID_INVITATION", "Invitation déjà utilisée ou invalide");
      }
      invitation.status = "COMPLETED";
      invitation.userId = user.id;
      invitation.tokenHash = null;
      invitation.passwordHash = null;
      await requestRepository.save(invitation);
    }

    return { user: toSsoUser(user), affiliationCreated: !existingAffiliation };
  });
}

async function expireOutstanding(teamId: string, email: string): Promise<void> {
  const repository = (await getDataSource()).getRepository(MemberRegistrationRequest);
  await repository.update(
    {
      teamId,
      email: normalizeEmail(email),
      status: In(["PENDING_EMAIL_VERIFICATION", "PENDING_CLUB_APPROVAL"]),
    },
    { status: "EXPIRED", tokenHash: null, passwordHash: null },
  );
}

async function createPendingRequest(input: {
  teamId: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  passwordHash?: string | null;
  provider: "PASSWORD" | "GOOGLE";
  mode: MemberRegistrationMode;
  status: "PENDING_EMAIL_VERIFICATION" | "PENDING_CLUB_APPROVAL";
  tokenHash?: string | null;
  expiresAt?: Date | null;
  userId?: string | null;
}): Promise<MemberRegistrationRequest> {
  await expireOutstanding(input.teamId, input.email);
  const repository = (await getDataSource()).getRepository(MemberRegistrationRequest);
  return repository.save(
    repository.create({
      teamId: input.teamId,
      email: normalizeEmail(input.email),
      name: input.name.trim(),
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      phoneNumber: input.phoneNumber?.trim() || null,
      passwordHash: input.passwordHash ?? null,
      provider: input.provider,
      modeSnapshot: input.mode,
      status: input.status,
      tokenHash: input.tokenHash ?? null,
      expiresAt: input.expiresAt ?? null,
      userId: input.userId ?? null,
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
    }),
  );
}

export async function registerPasswordMemberForClub(
  input: PasswordMemberRegistrationInput,
): Promise<MemberRegistrationResult> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name || input.password.length < 8 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MemberRegistrationError("INVALID", "Données d'inscription invalides");
  }

  const invitation = await findValidInvitation(input.teamId, email, input.invitationToken);
  const policy = await getMemberRegistrationPolicy(input.teamId);
  const decision = decideMemberRegistration({
    mode: policy.mode,
    hasValidInvitation: Boolean(invitation),
    emailVerifiedByProvider: false,
  });

  if (decision === "REJECT") {
    throw new MemberRegistrationError("REGISTRATION_CLOSED", "Les inscriptions sont fermées pour ce club");
  }
  if (decision === "REQUIRE_INVITATION") {
    throw new MemberRegistrationError("INVITATION_REQUIRED", "Une invitation valide du club est requise");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  if (decision === "CREATE_ACTIVE") {
    const active = await createOrAffilitateMember({
      teamId: input.teamId,
      email,
      name,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      allowExistingMember: false,
      invitationRequestId: invitation?.id ?? null,
    });
    return { status: "ACTIVE", ...active };
  }

  if (decision === "PENDING_EMAIL_VERIFICATION") {
    const rawToken = crypto.randomBytes(48).toString("base64url");
    const expiresAt = expiry();
    const request = await createPendingRequest({
      teamId: input.teamId,
      email,
      name,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      passwordHash,
      provider: "PASSWORD",
      mode: policy.mode,
      status: "PENDING_EMAIL_VERIFICATION",
      tokenHash: hashToken(rawToken),
      expiresAt,
    });
    const appUrl = (process.env.SSO_URL || "http://localhost:3004").replace(/\/$/, "");
    const verifyUrl = `${appUrl}/api/member-registration/verify?token=${encodeURIComponent(rawToken)}`;
    await sendEmail({
      to: email,
      subject: "Vérifiez votre inscription membre",
      html: `<p>Bonjour ${escapeHtml(name)},</p><p><a href="${verifyUrl}">Vérifier mon adresse email</a></p><p>Ce lien expire le ${expiresAt.toLocaleString("fr-FR")}.</p>`,
    });
    return { status: "PENDING_EMAIL_VERIFICATION", requestId: request.id };
  }

  const request = await createPendingRequest({
    teamId: input.teamId,
    email,
    name,
    firstName: input.firstName,
    lastName: input.lastName,
    phoneNumber: input.phoneNumber,
    passwordHash,
    provider: "PASSWORD",
    mode: policy.mode,
    status: "PENDING_CLUB_APPROVAL",
  });
  return { status: "PENDING_CLUB_APPROVAL", requestId: request.id };
}

export async function registerGoogleMemberForClub(
  input: GoogleMemberRegistrationInput,
): Promise<MemberRegistrationResult> {
  const email = normalizeEmail(input.email);
  const dataSource = await getDataSource();
  const existing = await dataSource.getRepository(User).findOne({ where: { email } });
  if (existing && existing.role !== "MEMBER") {
    throw new MemberRegistrationError("EMAIL_TAKEN", "Cet email appartient déjà à un compte interne");
  }
  if (existing) {
    const affiliation = await dataSource.getRepository(MemberTeamAffiliation).findOne({
      where: { userId: existing.id, teamId: input.teamId },
    });
    if (affiliation) {
      return { status: "ACTIVE", user: toSsoUser(existing), affiliationCreated: false };
    }
  }

  const invitation = await findValidInvitation(input.teamId, email, input.invitationToken);
  const policy = await getMemberRegistrationPolicy(input.teamId);
  const decision = decideMemberRegistration({
    mode: policy.mode,
    hasValidInvitation: Boolean(invitation),
    emailVerifiedByProvider: true,
  });

  // Un MEMBER existant conserve sa session globale même si une nouvelle affiliation est refusée.
  if (existing && (decision === "REJECT" || decision === "REQUIRE_INVITATION")) {
    return { status: "ACTIVE", user: toSsoUser(existing), affiliationCreated: false };
  }
  if (decision === "REJECT") {
    throw new MemberRegistrationError("REGISTRATION_CLOSED", "Les inscriptions sont fermées pour ce club");
  }
  if (decision === "REQUIRE_INVITATION") {
    throw new MemberRegistrationError("INVITATION_REQUIRED", "Une invitation valide du club est requise");
  }
  if (decision === "PENDING_CLUB_APPROVAL") {
    const request = await createPendingRequest({
      teamId: input.teamId,
      email,
      name: input.name,
      provider: "GOOGLE",
      mode: policy.mode,
      status: "PENDING_CLUB_APPROVAL",
      userId: existing?.id ?? null,
    });
    if (existing) {
      return { status: "ACTIVE", user: toSsoUser(existing), affiliationCreated: false };
    }
    return { status: "PENDING_CLUB_APPROVAL", requestId: request.id };
  }

  const active = await createOrAffilitateMember({
    teamId: input.teamId,
    email,
    name: input.name,
    allowExistingMember: true,
    invitationRequestId: invitation?.id ?? null,
  });
  return { status: "ACTIVE", ...active };
}

async function completeRequest(
  request: MemberRegistrationRequest,
  reviewedByUserId: string | null,
): Promise<SsoUser> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const requestRepository = manager.getRepository(MemberRegistrationRequest);
    const userRepository = manager.getRepository(User);
    const affiliationRepository = manager.getRepository(MemberTeamAffiliation);
    const current = await requestRepository.findOne({ where: { id: request.id } });
    if (!current || !["PENDING_EMAIL_VERIFICATION", "PENDING_CLUB_APPROVAL"].includes(current.status)) {
      throw new MemberRegistrationError("INVALID_REQUEST", "Cette demande n'est plus activable");
    }
    if (current.expiresAt && current.expiresAt.getTime() <= Date.now()) {
      current.status = "EXPIRED";
      current.tokenHash = null;
      current.passwordHash = null;
      await requestRepository.save(current);
      throw new MemberRegistrationError("INVALID_OR_EXPIRED_TOKEN", "Demande expirée");
    }

    let user = current.userId ? await userRepository.findOne({ where: { id: current.userId } }) : null;
    if (!user) user = await userRepository.findOne({ where: { email: current.email } });
    if (user && user.role !== "MEMBER") {
      throw new MemberRegistrationError("EMAIL_TAKEN", "Cet email appartient déjà à un compte interne");
    }
    if (!user) {
      const passwordHash =
        current.passwordHash ??
        (await bcrypt.hash(crypto.randomBytes(48).toString("hex"), SALT_ROUNDS));
      user = await userRepository.save(
        userRepository.create({
          id: crypto.randomUUID(),
          name: current.name,
          email: current.email,
          password: passwordHash,
          role: "MEMBER",
          isActive: true,
          teamId: null,
          firstName: current.firstName,
          lastName: current.lastName,
          phoneNumber: current.phoneNumber,
          tokenVersion: 0,
          federationId: null,
          leagueId: null,
          playerId: null,
        }),
      );
    }

    const affiliation = await affiliationRepository.findOne({ where: { userId: user.id, teamId: current.teamId } });
    if (!affiliation) {
      await affiliationRepository.save(affiliationRepository.create({ userId: user.id, teamId: current.teamId }));
    }
    current.status = "COMPLETED";
    current.userId = user.id;
    current.reviewedByUserId = reviewedByUserId;
    current.reviewedAt = reviewedByUserId ? new Date() : current.reviewedAt;
    current.tokenHash = null;
    current.passwordHash = null;
    await requestRepository.save(current);
    return toSsoUser(user);
  });
}

export async function verifyMemberRegistration(rawToken: string): Promise<SsoUser> {
  const repository = (await getDataSource()).getRepository(MemberRegistrationRequest);
  const request = await repository.findOne({ where: { tokenHash: hashToken(rawToken) } });
  if (
    !request ||
    request.status !== "PENDING_EMAIL_VERIFICATION" ||
    !request.expiresAt ||
    request.expiresAt.getTime() <= Date.now()
  ) {
    throw new MemberRegistrationError("INVALID_OR_EXPIRED_TOKEN", "Lien invalide ou expiré");
  }
  return completeRequest(request, null);
}

export async function listPendingMemberRegistrations(teamId: string): Promise<MemberRegistrationRequest[]> {
  return (await getDataSource()).getRepository(MemberRegistrationRequest).find({
    where: { teamId, status: "PENDING_CLUB_APPROVAL" },
    order: { createdAt: "ASC" },
  });
}

export async function approveMemberRegistration(
  teamId: string,
  requestId: string,
  actorUserId: string,
): Promise<SsoUser> {
  const request = await (await getDataSource()).getRepository(MemberRegistrationRequest).findOne({
    where: { id: requestId, teamId, status: "PENDING_CLUB_APPROVAL" },
  });
  if (!request) throw new MemberRegistrationError("INVALID_REQUEST", "Demande introuvable");
  return completeRequest(request, actorUserId);
}

export async function rejectMemberRegistration(
  teamId: string,
  requestId: string,
  actorUserId: string,
  reason: string,
): Promise<void> {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3 || trimmedReason.length > 1000) {
    throw new MemberRegistrationError("INVALID", "Un motif de refus est requis");
  }
  const repository = (await getDataSource()).getRepository(MemberRegistrationRequest);
  const request = await repository.findOne({ where: { id: requestId, teamId, status: "PENDING_CLUB_APPROVAL" } });
  if (!request) throw new MemberRegistrationError("INVALID_REQUEST", "Demande introuvable");
  request.status = "REJECTED";
  request.reviewedByUserId = actorUserId;
  request.reviewedAt = new Date();
  request.rejectionReason = trimmedReason;
  request.passwordHash = null;
  request.tokenHash = null;
  await repository.save(request);
}

export async function inviteMemberToClub(input: {
  teamId: string;
  email: string;
  actorUserId: string;
}): Promise<{ requestId: string; expiresAt: Date }> {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MemberRegistrationError("INVALID", "Adresse email invalide");
  }
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = expiry();
  const repository = (await getDataSource()).getRepository(MemberRegistrationRequest);
  await repository.update(
    { teamId: input.teamId, email, status: "INVITED" },
    { status: "EXPIRED", tokenHash: null },
  );
  const request = await repository.save(
    repository.create({
      teamId: input.teamId,
      email,
      name: email,
      firstName: null,
      lastName: null,
      phoneNumber: null,
      passwordHash: null,
      provider: "INVITATION",
      modeSnapshot: "INVITE_ONLY",
      status: "INVITED",
      tokenHash: hashToken(rawToken),
      expiresAt,
      userId: null,
      reviewedByUserId: input.actorUserId,
      reviewedAt: new Date(),
      rejectionReason: null,
    }),
  );
  const appUrl = (process.env.SSO_URL || "http://localhost:3004").replace(/\/$/, "");
  const url = `${appUrl}/membre/register?teamId=${encodeURIComponent(input.teamId)}&invite=${encodeURIComponent(rawToken)}`;
  await sendEmail({
    to: email,
    subject: "Invitation à rejoindre le club",
    html: `<p>Votre club vous invite à créer ou rattacher votre espace membre.</p><p><a href="${url}">Accepter l'invitation</a></p><p>Ce lien expire le ${expiresAt.toLocaleString("fr-FR")}.</p>`,
  });
  return { requestId: request.id, expiresAt };
}
