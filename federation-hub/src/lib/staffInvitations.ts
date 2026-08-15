import { randomBytes, createHash } from 'node:crypto'
import { In, IsNull } from 'typeorm'
import { getDataSource } from './db'
import { StaffInvitation, Team, Federation, League, type StaffInvitationRole } from './entities'
import { sendEmail } from './mailer'
import { toPlain } from './serialization'
import { createIdentityUser, getIdentityUserByEmail, type IdentityUser } from './identityClient'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000
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
  scopeName: string
}

async function resolveScope(input: CreateInvitationInput): Promise<ResolvedScope> {
  const dataSource = await getDataSource()

  if (CLUB_ROLES.includes(input.role)) {
    if (!input.teamId) throw new Error('teamId est requis pour ce rôle')
    const team = await dataSource.getRepository(Team).findOne({ where: { id: input.teamId } })
    if (!team) throw new Error('Club introuvable')
    return { teamId: team.id, federationId: null, leagueId: null, scopeName: team.nom }
  }

  if (input.role === 'FEDERATION_ADMIN') {
    if (!input.federationId) throw new Error('federationId est requis pour ce rôle')
    const federation = await dataSource.getRepository(Federation).findOne({ where: { id: input.federationId } })
    if (!federation) throw new Error('Fédération introuvable')
    return { teamId: null, federationId: federation.id, leagueId: null, scopeName: federation.nom }
  }

  if (input.role === 'LEAGUE_ADMIN') {
    if (!input.leagueId) throw new Error('leagueId est requis pour ce rôle')
    const league = await dataSource.getRepository(League).findOne({ where: { id: input.leagueId } })
    if (!league) throw new Error('Ligue introuvable')
    return { teamId: null, federationId: null, leagueId: league.id, scopeName: league.nom }
  }

  return { teamId: null, federationId: null, leagueId: null, scopeName: 'la plateforme' }
}

export async function createInvitation(
  input: CreateInvitationInput,
  appUrl: string,
): Promise<{ id: string }> {
  const dataSource = await getDataSource()
  const invitationRepo = dataSource.getRepository(StaffInvitation)
  const scope = await resolveScope(input)

  // Identity owns account uniqueness; federation-hub never reads User directly.
  if (await getIdentityUserByEmail(input.email)) {
    throw new Error('Un compte existe déjà avec cet email')
  }

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

const STAFF_ROLES: StaffInvitationRole[] = [
  'FEDERATION_ADMIN',
  'LEAGUE_ADMIN',
  'REFEREE',
  'MATCH_OFFICIAL',
  'REFEREE_OBSERVER',
]

export async function listStaffInvitations(
  scopeFederationId?: string | null,
): Promise<StaffInvitationSummary[]> {
  const dataSource = await getDataSource()
  const invitations = await dataSource.getRepository(StaffInvitation).find({
    where: STAFF_ROLES.map((role) => ({ role })),
    order: { createdAt: 'DESC' },
  })

  const federationIds = [
    ...new Set(invitations.map((i) => i.federationId).filter((id): id is string => !!id)),
  ]
  const leagueIds = [
    ...new Set(invitations.map((i) => i.leagueId).filter((id): id is string => !!id)),
  ]

  const federations = federationIds.length
    ? await dataSource.getRepository(Federation).find({ where: { id: In(federationIds) } })
    : []
  const leagues = leagueIds.length
    ? await dataSource.getRepository(League).find({ where: { id: In(leagueIds) } })
    : []

  const federationNames = new Map(federations.map((f) => [f.id, f.nom]))
  const leagueNames = new Map(leagues.map((l) => [l.id, l.nom]))
  const leagueFederationIds = new Map(leagues.map((l) => [l.id, l.federation_id]))

  const scoped = scopeFederationId
    ? invitations.filter((invitation) => {
        if (invitation.federationId) return invitation.federationId === scopeFederationId
        if (invitation.leagueId) {
          return leagueFederationIds.get(invitation.leagueId) === scopeFederationId
        }
        return true
      })
    : invitations

  const now = Date.now()
  return toPlain(
    scoped.map((invitation) => ({
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      role: invitation.role,
      federationId: invitation.federationId ?? null,
      federationName: invitation.federationId
        ? federationNames.get(invitation.federationId) ?? null
        : null,
      leagueId: invitation.leagueId ?? null,
      leagueName: invitation.leagueId ? leagueNames.get(invitation.leagueId) ?? null : null,
      status: invitation.acceptedAt
        ? 'ACCEPTED'
        : invitation.expiresAt.getTime() < now
          ? 'EXPIRED'
          : 'PENDING',
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    })),
  )
}

export interface InvitationPreview {
  name: string
  email: string
  role: StaffInvitationRole
  scopeName: string
}

export async function getInvitationPreview(rawToken: string): Promise<InvitationPreview | null> {
  const dataSource = await getDataSource()
  const invitationRepo = dataSource.getRepository(StaffInvitation)
  const invitation = await invitationRepo.findOne({ where: { tokenHash: hashToken(rawToken) } })
  const isExpired = !invitation || new Date(invitation.expiresAt).getTime() < Date.now()
  if (!invitation || invitation.acceptedAt || isExpired) return null

  let scopeName = 'la plateforme'
  if (invitation.teamId) {
    const team = await dataSource.getRepository(Team).findOne({ where: { id: invitation.teamId } })
    scopeName = team?.nom ?? 'Club'
  } else if (invitation.federationId) {
    const federation = await dataSource
      .getRepository(Federation)
      .findOne({ where: { id: invitation.federationId } })
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

export async function acceptInvitation(
  rawToken: string,
  password: string,
): Promise<AcceptInvitationResult> {
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
    if (!isOwnRetry) return { ok: false, error: 'email_taken' }
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
