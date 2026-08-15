import { createRefereeAvailabilityDirectory } from '@/adapters/referee/createRefereeAvailabilityDirectory'
import type { IdentityRole } from '../../../packages/domain-contracts/src/identity'
import { getDataSource } from './db'
import { Team } from './entities'
import {
  createIdentityUser,
  deleteIdentityUser,
  listIdentityUsers,
  updateIdentityUser,
} from './identityClient'
import { toPlain, toPlainArray } from './serialization'

export interface ClubWithAccountCount {
  id: string
  nom: string
  nom_ar?: string | null
  logo_url?: string | null
  accountCount: number
}

export interface ClubUser {
  id: string
  name: string
  email: string
  role: IdentityRole
  isActive: boolean
  createdAt: Date
}

/**
 * Team is federation-owned, account directory is Identity-owned. The join is
 * performed in application memory so federation-hub no longer reads User.
 */
export async function listClubsWithAccountCounts(): Promise<ClubWithAccountCount[]> {
  const dataSource = await getDataSource()
  const [teams, users] = await Promise.all([
    dataSource.getRepository(Team).find({
      where: { team_type: 'club' },
      order: { nom: 'ASC' },
    }),
    listIdentityUsers({ hasTeam: true }),
  ])

  const countByTeam = new Map<string, number>()
  for (const user of users) {
    if (!user.teamId) continue
    countByTeam.set(user.teamId, (countByTeam.get(user.teamId) ?? 0) + 1)
  }

  return toPlainArray(
    teams.map((team) => ({
      id: team.id,
      nom: team.nom,
      nom_ar: team.nom_ar ?? null,
      logo_url: team.logo_url ?? null,
      accountCount: countByTeam.get(team.id) ?? 0,
    })),
  )
}

export async function getClubById(
  teamId: string,
): Promise<{ id: string; nom: string; logo_url?: string | null } | null> {
  const dataSource = await getDataSource()
  const team = await dataSource.getRepository(Team).findOne({ where: { id: teamId } })
  if (!team) return null
  return toPlain({ id: team.id, nom: team.nom, logo_url: team.logo_url ?? null })
}

export async function listUsersForTeam(teamId: string): Promise<ClubUser[]> {
  const users = await listIdentityUsers({ teamId })
  return toPlainArray(
    users
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: new Date(user.createdAt),
      }))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
  )
}

export interface OfficialAccount {
  id: string
  name: string
  email: string
  role: 'REFEREE' | 'MATCH_OFFICIAL' | 'REFEREE_OBSERVER'
  isActive: boolean
  unavailable: boolean
  unavailableFrom?: string | null
  unavailableTo?: string | null
  unavailableReason?: string | null
}

export async function listOfficialAccounts(matchDate?: Date | null): Promise<OfficialAccount[]> {
  const users = await listIdentityUsers({
    roles: ['REFEREE', 'MATCH_OFFICIAL', 'REFEREE_OBSERVER'],
  })

  const availabilityByUser = matchDate
    ? (
        await createRefereeAvailabilityDirectory().checkAvailabilityBatch({
          userIds: users.map((user) => user.id),
          date: matchDate.toISOString().slice(0, 10),
        })
      ).availabilityByUser
    : {}

  return toPlainArray(
    users
      .map((user) => {
        const availability = availabilityByUser[user.id]
        const period = availability?.blockingPeriod
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as OfficialAccount['role'],
          isActive: user.isActive,
          unavailable: availability?.available === false,
          unavailableFrom: period?.startDate ?? null,
          unavailableTo: period?.endDate ?? null,
          unavailableReason: period?.reason ?? null,
        }
      })
      .sort(
        (left, right) =>
          Number(right.unavailable) - Number(left.unavailable) || left.name.localeCompare(right.name),
      ),
  )
}

export interface CreateClubUserInput {
  teamId: string
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'OBSERVATEUR'
}

export async function createClubUser(input: CreateClubUserInput): Promise<ClubUser> {
  const dataSource = await getDataSource()
  const team = await dataSource.getRepository(Team).findOne({ where: { id: input.teamId } })
  if (!team) throw new Error('Club introuvable')

  const result = await createIdentityUser({
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
    teamId: input.teamId,
  })
  if (!result.ok) throw new Error('Email déjà utilisé')

  return toPlain({
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    isActive: result.user.isActive,
    createdAt: new Date(result.user.createdAt),
  })
}

export interface UpdateClubUserInput {
  isActive?: boolean
  role?: 'ADMIN' | 'OBSERVATEUR'
  password?: string
}

export async function updateClubUser(id: string, input: UpdateClubUserInput): Promise<ClubUser> {
  try {
    const user = await updateIdentityUser(id, input)
    return toPlain({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: new Date(user.createdAt),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'not_found') {
      throw new Error('Compte non trouvé')
    }
    throw error
  }
}

export async function deleteClubUser(id: string): Promise<void> {
  try {
    await deleteIdentityUser(id)
  } catch (error) {
    if (error instanceof Error && error.message === 'not_found') {
      throw new Error('Compte non trouvé')
    }
    throw error
  }
}
