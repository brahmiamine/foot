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

/** Minimal account profile safe to consume from other bounded contexts. */
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
  /** true = only users attached to a team; false = only users without team. */
  hasTeam?: boolean
}

export interface CreateIdentityAccountInput {
  name: string
  email: string
  password: string
  role: IdentityRole
  teamId?: string | null
  playerId?: string | null
  federationId?: string | null
  leagueId?: string | null
}

/** Narrow lookup used by profile-oriented applications such as referee-hub. */
export interface IdentityProfilePort {
  getUserProfile(id: string): Promise<IdentityUserProfile | null>
}

export interface IdentityDirectoryPort {
  listUsers(search?: IdentityUserSearch): Promise<IdentityUserRecord[]>
  getUserByEmail(email: string): Promise<IdentityUserRecord | null>
}

export interface IdentityAccountProvisioningPort {
  createUser(input: CreateIdentityAccountInput): Promise<IdentityUserRecord>
  updateUser(
    id: string,
    input: { isActive?: boolean; role?: IdentityRole; password?: string },
  ): Promise<IdentityUserRecord>
  deleteUser(id: string): Promise<void>
}
