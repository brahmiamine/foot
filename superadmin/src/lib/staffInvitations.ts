import { randomBytes, createHash } from 'node:crypto'
import { In, IsNull } from 'typeorm'
import { getDataSource } from './db'
import { StaffInvitation, Team, Federation, League, User, type StaffInvitationRole } from './entities'
import { sendEmail } from './mailer'
import { toPlain } from './serialization'
import { createIdentityUser, getIdentityUserByEmail, type IdentityUser } from './identityClient'

/**
 * Invitation à usage unique pour créer un compte staff — remplace la
 * création "à la main" où `superadmin` choisissait lui-même le mot de
 * passe du compte (voir clubAccounts.ts, createClubUser, toujours
 * disponible mais plus utilisée par l'UI de /admin/club). Le destinataire
 * choisit lui-même son mot de passe en acceptant l'invitation, jamais connu
 * de `superadmin` (voir sso/src/lib/passwordReset.ts pour le même principe
 * appliqué à la réinitialisation de mot de passe).
 *
 * migration.md §0 (provisioning) : élargi au-delà d'ADMIN/OBSERVATEUR d'un
 * club (voir StaffInvitation entity) pour couvrir FEDERATION_ADMIN,
 * LEAGUE_ADMIN, REFEREE, MATCH_OFFICIAL, REFEREE_OBSERVER — exactement un
 * scope requis selon le rôle, imposé par `createInvitation` ci-dessous.
 */

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

const CLUB_ROLES: StaffInvitationRole[] = ['ADMIN', 'OBSERVATEUR']

export const ROLE_LABELS: Record<StaffInvitationRole, string> = {
  ADMIN: 'Admin',
  OBSERVATEUR: 'Observateur',
  FEDERATION_ADMIN: 'Administrateur fédéral',
  LEAGUE_ADMIN: 'Administrateur de ligue',
  REFEREE: 'Arbitre',
  MATCH_OFFICIAL: 'Officiel de match',
  REFEREE_OBSERVER: "Observateur d'arbitres",
}

function roleLabel(role: StaffInvitationRole): string {
  return ROLE_LABELS[role]
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export interface CreateInvitationInput {
  name: string
  email: string
  role: StaffInvitationRole
  teamId?: string | null
  federationId?: string | null
  leagueId?: string | null
}

interface ResolvedScope {
  teamId: string | null
  federationId: string | null
  leagueId: string | null
  /** Nom lisible de l'entité concernée, pour le sujet/corps de l'email — "la plateforme" pour les rôles sans scope propre (arbitrage). */
  scopeName: string
}

/**
 * Impose exactement le scope attendu par le rôle (migration.md §3 : ne
 * jamais faire confiance à un scope fourni sans le revérifier) et résout
 * son nom lisible pour l'email d'invitation.
 */
async function resolveScope(input: CreateInvitationInput): Promise<ResolvedScope> {
  const dataSource = await getDataSource()

  if (CLUB_ROLES.includes(input.role)) {
    if (!input.teamId) {
      throw new Error('teamId est requis pour ce rôle')
    }
    const team = await dataSource.getRepository(Team).findOne({ where: { id: input.teamId } })
    if (!team) {
      throw new Error('Club introuvable')
    }
    return { teamId: team.id, federationId: null, leagueId: null, scopeName: team.nom }
  }

  if (input.role === 'FEDERATION_ADMIN') {
    if (!input.federationId) {
      throw new Error('federationId est requis pour ce rôle')
    }
    const federation = await dataSource.getRepository(Federation).findOne({ where: { id: input.federationId } })
    if (!federation) {
      throw new Error('Fédération introuvable')
    }
    return { teamId: null, federationId: federation.id, leagueId: null, scopeName: federation.nom }
  }

  if (input.role === 'LEAGUE_ADMIN') {
    if (!input.leagueId) {
      throw new Error('leagueId est requis pour ce rôle')
    }
    const league = await dataSource.getRepository(League).findOne({ where: { id: input.leagueId } })
    if (!league) {
      throw new Error('Ligue introuvable')
    }
    return { teamId: null, federationId: null, leagueId: league.id, scopeName: league.nom }
  }

  // REFEREE / MATCH_OFFICIAL / REFEREE_OBSERVER : pas de scope à la création
  // du compte — leur périmètre réel est vérifié match par match (Phase 4,
  // match_official_assignments) / fédération par fédération à la
  // validation (Phase 5), jamais figé sur le compte lui-même.
  return { teamId: null, federationId: null, leagueId: null, scopeName: 'la plateforme' }
}

export async function createInvitation(input: CreateInvitationInput, appUrl: string): Promise<{ id: string }> {
  const dataSource = await getDataSource()
  const userRepo = dataSource.getRepository(User)
  const invitationRepo = dataSource.getRepository(StaffInvitation)

  const scope = await resolveScope(input)

  const existingUser = await userRepo.findOne({ where: { email: input.email } })
  if (existingUser) {
    throw new Error('Un compte existe déjà avec cet email')
  }

  // Une invitation déjà envoyée mais jamais acceptée pour ce même email est
  // remplacée plutôt qu'empilée — un seul lien valide à la fois par email.
  await invitationRepo.delete({ email: input.email, acceptedAt: IsNull() })

  const rawToken = randomBytes(32).toString('hex')
  const invitation = invitationRepo.create({
    teamId: scope.teamId,
    federationId: scope.federationId,
    leagueId: scope.leagueId,
    name: input.name,
    email: input.email,
    role: input.role,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  })
  const saved = await invitationRepo.save(invitation)

  const inviteUrl = `${appUrl.replace(/\/$/, '')}/invite/${rawToken}`
  const label = roleLabel(input.role)
  const subject = CLUB_ROLES.includes(input.role)
    ? `Invitation à rejoindre ${scope.scopeName}`
    : `Invitation à administrer ${scope.scopeName} (${label})`
  const bodyIntro = CLUB_ROLES.includes(input.role)
    ? `Vous avez été invité(e) à administrer le club <strong>${scope.scopeName}</strong> (rôle ${label}).`
    : `Vous avez été invité(e) en tant que <strong>${label}</strong> pour <strong>${scope.scopeName}</strong>.`
  await sendEmail({
    to: input.email,
    subject,
    html: `
      <p>Bonjour ${input.name},</p>
      <p>${bodyIntro}</p>
      <p><a href="${inviteUrl}">Accepter l'invitation et créer mon mot de passe</a></p>
      <p>Ce lien expire dans 7 jours et ne peut être utilisé qu'une seule fois.</p>
    `,
  })

  return { id: saved.id }
}

export interface StaffInvitationSummary {
  id: string
  name: string
  email: string
  role: StaffInvitationRole
  federationId: string | null
  federationName: string | null
  leagueId: string | null
  leagueName: string | null
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
}

const STAFF_ROLES: StaffInvitationRole[] = ['FEDERATION_ADMIN', 'LEAGUE_ADMIN', 'REFEREE', 'MATCH_OFFICIAL', 'REFEREE_OBSERVER']

/**
 * Invitations fédération/ligue/officiels (migration.md §0), triées les
 * plus récentes d'abord — les invitations ADMIN/OBSERVATEUR d'un club
 * restent affichées séparément par `/admin/club/:teamId` (comptes déjà
 * listés là, pas dupliqués ici).
 */
export async function listStaffInvitations(): Promise<StaffInvitationSummary[]> {
  const dataSource = await getDataSource()
  const invitations = await dataSource.getRepository(StaffInvitation).find({
    where: STAFF_ROLES.map((role) => ({ role })),
    order: { createdAt: 'DESC' },
  })

  const federationIds = [...new Set(invitations.map((i) => i.federationId).filter((id): id is string => !!id))]
  const leagueIds = [...new Set(invitations.map((i) => i.leagueId).filter((id): id is string => !!id))]

  const federations = federationIds.length
    ? await dataSource.getRepository(Federation).find({ where: { id: In(federationIds) } })
    : []
  const leagues = leagueIds.length
    ? await dataSource.getRepository(League).find({ where: { id: In(leagueIds) } })
    : []

  const federationNames = new Map(federations.map((f) => [f.id, f.nom]))
  const leagueNames = new Map(leagues.map((l) => [l.id, l.nom]))

  const now = Date.now()
  return toPlain(
    invitations.map((invitation) => ({
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      role: invitation.role,
      federationId: invitation.federationId ?? null,
      federationName: invitation.federationId ? federationNames.get(invitation.federationId) ?? null : null,
      leagueId: invitation.leagueId ?? null,
      leagueName: invitation.leagueId ? leagueNames.get(invitation.leagueId) ?? null : null,
      status: invitation.acceptedAt ? 'ACCEPTED' : invitation.expiresAt.getTime() < now ? 'EXPIRED' : 'PENDING',
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    }))
  )
}

export interface InvitationPreview {
  name: string
  email: string
  role: StaffInvitationRole
  /** Nom lisible du club/fédération/ligue concerné, ou "la plateforme" pour les rôles d'arbitrage. */
  scopeName: string
}

export async function getInvitationPreview(rawToken: string): Promise<InvitationPreview | null> {
  const dataSource = await getDataSource()
  const invitationRepo = dataSource.getRepository(StaffInvitation)

  const invitation = await invitationRepo.findOne({ where: { tokenHash: hashToken(rawToken) } })
  const isExpired = !invitation || new Date(invitation.expiresAt).getTime() < Date.now()
  if (!invitation || invitation.acceptedAt || isExpired) {
    return null
  }

  let scopeName = 'la plateforme'
  if (invitation.teamId) {
    const team = await dataSource.getRepository(Team).findOne({ where: { id: invitation.teamId } })
    scopeName = team?.nom ?? 'Club'
  } else if (invitation.federationId) {
    const federation = await dataSource.getRepository(Federation).findOne({ where: { id: invitation.federationId } })
    scopeName = federation?.nom ?? 'Fédération'
  } else if (invitation.leagueId) {
    const league = await dataSource.getRepository(League).findOne({ where: { id: invitation.leagueId } })
    scopeName = league?.nom ?? 'Ligue'
  }

  return {
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    scopeName,
  }
}

export interface AcceptedInvitationUser {
  id: string
  name: string
  email: string
  role: StaffInvitationRole
  isActive: boolean
  createdAt: Date
}

export type AcceptInvitationResult =
  | { ok: true; user: AcceptedInvitationUser }
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
 * exactement à cette invitation (même email, rôle, scope) : si oui, c'est
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
    teamId: invitation.teamId ?? null,
    federationId: invitation.federationId ?? null,
    leagueId: invitation.leagueId ?? null,
  })

  let identityUser: IdentityUser
  if (createResult.ok) {
    identityUser = createResult.user
  } else {
    const existing = await getIdentityUserByEmail(invitation.email)
    const isOwnRetry =
      existing !== null &&
      existing.role === invitation.role &&
      (existing.teamId ?? null) === (invitation.teamId ?? null) &&
      (existing.federationId ?? null) === (invitation.federationId ?? null) &&
      (existing.leagueId ?? null) === (invitation.leagueId ?? null)
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
      role: identityUser.role as StaffInvitationRole,
      isActive: identityUser.isActive,
      createdAt: new Date(identityUser.createdAt),
    }),
  }
}
