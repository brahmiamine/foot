import { randomBytes, createHash } from 'node:crypto'
import { IsNull } from 'typeorm'
import { getDataSource } from './db'
import { StaffInvitation, Team, User, type UserRole } from './entities'
import { sendEmail } from './mailer'
import { toPlain } from './serialization'
import { createIdentityUser, getIdentityUserByEmail, type IdentityUser } from './identityClient'
import type { ClubUser } from './clubAccounts'

/**
 * Invitation à usage unique pour créer un compte staff (ADMIN/OBSERVATEUR)
 * — remplace la création "à la main" où `superadmin` choisissait lui-même
 * le mot de passe du compte (voir clubAccounts.ts, createClubUser, toujours
 * disponible mais plus utilisée par l'UI de /admin/club). Le destinataire
 * choisit lui-même son mot de passe en acceptant l'invitation, jamais connu
 * de `superadmin` (voir sso/src/lib/passwordReset.ts pour le même principe
 * appliqué à la réinitialisation de mot de passe).
 */

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export interface CreateInvitationInput {
  teamId: string
  name: string
  email: string
  role: 'ADMIN' | 'OBSERVATEUR'
}

export async function createInvitation(input: CreateInvitationInput, appUrl: string): Promise<{ id: string }> {
  const dataSource = await getDataSource()
  const teamRepo = dataSource.getRepository(Team)
  const userRepo = dataSource.getRepository(User)
  const invitationRepo = dataSource.getRepository(StaffInvitation)

  const team = await teamRepo.findOne({ where: { id: input.teamId } })
  if (!team) {
    throw new Error('Club introuvable')
  }

  const existingUser = await userRepo.findOne({ where: { email: input.email } })
  if (existingUser) {
    throw new Error('Un compte existe déjà avec cet email')
  }

  // Une invitation déjà envoyée mais jamais acceptée pour ce même email est
  // remplacée plutôt qu'empilée — un seul lien valide à la fois par email.
  await invitationRepo.delete({ email: input.email, acceptedAt: IsNull() })

  const rawToken = randomBytes(32).toString('hex')
  const invitation = invitationRepo.create({
    teamId: input.teamId,
    name: input.name,
    email: input.email,
    role: input.role,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  })
  const saved = await invitationRepo.save(invitation)

  const inviteUrl = `${appUrl.replace(/\/$/, '')}/invite/${rawToken}`
  await sendEmail({
    to: input.email,
    subject: `Invitation à rejoindre ${team.nom}`,
    html: `
      <p>Bonjour ${input.name},</p>
      <p>Vous avez été invité(e) à administrer le club <strong>${team.nom}</strong> (rôle ${input.role === 'ADMIN' ? 'Admin' : 'Observateur'}).</p>
      <p><a href="${inviteUrl}">Accepter l'invitation et créer mon mot de passe</a></p>
      <p>Ce lien expire dans 7 jours et ne peut être utilisé qu'une seule fois.</p>
    `,
  })

  return { id: saved.id }
}

export interface InvitationPreview {
  name: string
  email: string
  role: UserRole
  clubName: string
}

export async function getInvitationPreview(rawToken: string): Promise<InvitationPreview | null> {
  const dataSource = await getDataSource()
  const invitationRepo = dataSource.getRepository(StaffInvitation)
  const teamRepo = dataSource.getRepository(Team)

  const invitation = await invitationRepo.findOne({ where: { tokenHash: hashToken(rawToken) } })
  const isExpired = !invitation || new Date(invitation.expiresAt).getTime() < Date.now()
  if (!invitation || invitation.acceptedAt || isExpired) {
    return null
  }

  const team = await teamRepo.findOne({ where: { id: invitation.teamId } })
  return {
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    clubName: team?.nom ?? 'Club',
  }
}

export type AcceptInvitationResult =
  | { ok: true; user: ClubUser }
  | { ok: false; error: 'invalid_or_expired_token' | 'email_taken' }

/**
 * TS-53 (avancement.md, Epic E17) : la création du compte délègue à `sso`
 * (seul propriétaire de `User`, voir TS-30) plutôt que d'écrire
 * directement dans la table — `sso` hache lui-même le mot de passe (voir
 * identityClient.ts / sso/src/lib/identityService.ts), il n'est jamais
 * connu de `superadmin`. `sso.createUser` fait déjà l'unique vérification
 * d'email en doublon nécessaire (`email_taken`), inutile de la répéter ici
 * par une lecture directe de `User`.
 *
 * TASK-P0-013 (todo.md) : les deux écritures (compte sso, puis
 * `invitation.acceptedAt` en local) ne sont pas transactionnelles — si la
 * seconde échoue après le succès de la première, un rejeu (retry réseau,
 * double clic) retomberait sur `email_taken` alors que LE compte de CET
 * utilisateur vient d'être créé avec succès. Pour rester idempotent sans
 * saga distribuée, on vérifie dans ce cas si le compte existant correspond
 * exactement à cette invitation (même email, rôle, club) : si oui, c'est
 * notre propre création, on la traite comme un succès ; sinon c'est un
 * vrai conflit (email pris par un tiers).
 */
export async function acceptInvitation(rawToken: string, password: string): Promise<AcceptInvitationResult> {
  const dataSource = await getDataSource()
  const invitationRepo = dataSource.getRepository(StaffInvitation)

  const invitation = await invitationRepo.findOne({ where: { tokenHash: hashToken(rawToken) } })
  const isExpired = !invitation || new Date(invitation.expiresAt).getTime() < Date.now()
  if (!invitation || invitation.acceptedAt || isExpired) {
    return { ok: false, error: 'invalid_or_expired_token' }
  }

  const createResult = await createIdentityUser({
    name: invitation.name,
    email: invitation.email,
    password,
    role: invitation.role,
    teamId: invitation.teamId,
  })

  let identityUser: IdentityUser
  if (createResult.ok) {
    identityUser = createResult.user
  } else {
    const existing = await getIdentityUserByEmail(invitation.email)
    const isOwnRetry =
      existing !== null && existing.role === invitation.role && existing.teamId === invitation.teamId
    if (!isOwnRetry) {
      return { ok: false, error: 'email_taken' }
    }
    identityUser = existing
  }

  invitation.acceptedAt = new Date()
  await invitationRepo.save(invitation)

  return {
    ok: true,
    user: toPlain({
      id: identityUser.id,
      name: identityUser.name,
      email: identityUser.email,
      role: identityUser.role as 'ADMIN' | 'OBSERVATEUR',
      isActive: identityUser.isActive,
      createdAt: new Date(identityUser.createdAt),
    }),
  }
}
