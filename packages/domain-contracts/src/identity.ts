export const IDENTITY_ROLES = [
  'ADMIN',
  'OBSERVATEUR',
  'SUPERADMIN',
  'MEMBER',
  'PLATFORM_SUPERADMIN',
  'FEDERATION_ADMIN',
  'LEAGUE_ADMIN',
  'REFEREE',
  'MATCH_OFFICIAL',
  'REFEREE_OBSERVER',
  'PLAYER',
] as const

export type IdentityRole = (typeof IDENTITY_ROLES)[number]

export interface IdentityUserProfile {
  id: string
  name: string
  email: string
  role: IdentityRole
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
}

export interface IdentityUserRecord extends IdentityUserProfile {
  isActive: boolean
  teamId: string | null
  playerId?: string | null
  federationId?: string | null
  leagueId?: string | null
  createdAt: string
}

export interface IdentityUserSearch {
  teamId?: string
  roles?: IdentityRole[]
  hasTeam?: boolean
}

export interface CreateIdentityAccountInput {
  name: string
  email: string
  password: string
  role: IdentityRole
  isActive?: boolean
  teamId?: string | null
  playerId?: string | null
  federationId?: string | null
  leagueId?: string | null
}

export interface UpdateIdentityAccountInput {
  name?: string
  email?: string
  isActive?: boolean
  role?: IdentityRole
  password?: string
}

export interface InvitePlayerAccountInput {
  name: string
  email: string
  teamId: string
  playerId: string
  invitedByUserId?: string | null
}

export interface IdentityAccountInvitationResult {
  userId: string
  email: string
  teamId: string
  playerId: string
  expiresAt: string
}

export type MemberRegistrationMode =
  | 'OPEN'
  | 'EMAIL_VERIFICATION'
  | 'CLUB_APPROVAL'
  | 'INVITE_ONLY'
  | 'CLOSED'

export interface EffectiveMemberRegistrationPolicy {
  teamId: string
  mode: MemberRegistrationMode
  version: number
  source: 'DEFAULT' | 'DATABASE'
  effectiveFrom: string | null
  effectiveUntil: string | null
}

export interface UpdateMemberRegistrationPolicyInput {
  teamId: string
  mode: MemberRegistrationMode
  actorUserId: string
  actorRole: string
  reason: string
  effectiveFrom?: string | null
  effectiveUntil?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export interface MemberRegistrationQueueItem {
  id: string
  teamId: string
  email: string
  name: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  provider: 'PASSWORD' | 'GOOGLE' | 'INVITATION'
  modeSnapshot: MemberRegistrationMode
  status: 'PENDING_CLUB_APPROVAL'
  userId: string | null
  createdAt: string
}

export interface InviteMemberInput {
  teamId: string
  email: string
  actorUserId: string
}

export interface InviteMemberResult {
  requestId: string
  expiresAt: string
}

export interface IdentityProfilePort {
  getUserProfile(id: string): Promise<IdentityUserProfile | null>
}

export interface IdentityDirectoryPort {
  listUsers(search?: IdentityUserSearch): Promise<IdentityUserRecord[]>
  getUserById(id: string): Promise<IdentityUserRecord | null>
  getUserByEmail(email: string): Promise<IdentityUserRecord | null>
}

export interface IdentityAccountProvisioningPort {
  createUser(input: CreateIdentityAccountInput): Promise<IdentityUserRecord>
  updateUser(id: string, input: UpdateIdentityAccountInput): Promise<IdentityUserRecord>
  deleteUser(id: string): Promise<void>
}

/** Dedicated capability: callers never provide or generate a temporary password. */
export interface IdentityPlayerInvitationPort {
  invitePlayerAccount(input: InvitePlayerAccountInput): Promise<IdentityAccountInvitationResult>
}

export interface IdentityMemberRegistrationAdminPort {
  getMemberRegistrationPolicy(teamId: string): Promise<EffectiveMemberRegistrationPolicy>
  updateMemberRegistrationPolicy(input: UpdateMemberRegistrationPolicyInput): Promise<EffectiveMemberRegistrationPolicy>
  listPendingMemberRegistrations(teamId: string): Promise<MemberRegistrationQueueItem[]>
  approveMemberRegistration(teamId: string, requestId: string, actorUserId: string): Promise<void>
  rejectMemberRegistration(teamId: string, requestId: string, actorUserId: string, reason: string): Promise<void>
  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult>
}