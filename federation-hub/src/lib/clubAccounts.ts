import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { createRefereeAvailabilityDirectory } from '@/adapters/referee/createRefereeAvailabilityDirectory'
import { getDataSource } from './db'
import { Team, User, type UserRole } from './entities'
import { toPlain, toPlainArray } from './serialization'
import { deleteIdentityUser, updateIdentityUser } from './identityClient'

/**
 * Gestion des comptes de connexion des clubs (table `User`, partagée avec
 * cardManager/club-hub). Fonctionnalité reprise de l'ancienne app
 * "federation-hub" (supprimée) — un compte ADMIN/OBSERVATEUR appartient à un
 * club et sert à se connecter à cardManager/club-hub, jamais à ArbiNote.
 */

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
  role: UserRole
  isActive: boolean
  createdAt: Date
}

export async function listClubsWithAccountCounts(): Promise<ClubWithAccountCount[]> {
  const dataSource = await getDataSource()
  const teams = await dataSource.getRepository(Team).find({
    where: { team_type: 'club' },
    order: { nom: 'ASC' },
  })

  const counts = await dataSource
    .getRepository(User)
    .createQueryBuilder('user')
    .select('user.teamId', 'teamId')
    .addSelect('COUNT(*)', 'count')
    .where('user.teamId IS NOT NULL')
    .groupBy('user.teamId')
    .getRawMany<{ teamId: string; count: string }>()

  const countByTeam = new Map(counts.map((row) => [row.teamId, Number(row.count)]))

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
  const dataSource = await getDataSource()
  const users = await dataSource.getRepository(User).find({
    where: { teamId },
    order: { createdAt: 'DESC' },
  })
  return toPlainArray(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
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

/**
 * Comptes SSO REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER (migration.md §0/§11).
 * Availability is owned by referee-hub and consumed through a batch port so
 * this selector no longer knows the referee_unavailabilities table.
 */
export async function listOfficialAccounts(matchDate?: Date | null): Promise<OfficialAccount[]> {
  const dataSource = await getDataSource()
  const users = await dataSource.getRepository(User).find({
    where: [{ role: 'REFEREE' }, { role: 'MATCH_OFFICIAL' }, { role: 'REFEREE_OBSERVER' }],
    order: { name: 'ASC' },
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
      .map((u) => {
        const availability = availabilityByUser[u.id]
        const period = availability?.blockingPeriod
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as 'REFEREE' | 'MATCH_OFFICIAL' | 'REFEREE_OBSERVER',
          isActive: u.isActive,
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
  const repository = dataSource.getRepository(User)

  const team = await dataSource.getRepository(Team).findOne({ where: { id: input.teamId } })
  if (!team) {
    throw new Error('Club introuvable')
  }

  const existing = await repository.findOne({ where: { email: input.email } })
  if (existing) {
    throw new Error('Email déjà utilisé')
  }

  const hashed = await bcrypt.hash(input.password, 12)
  const user = repository.create({
    id: randomUUID(),
    name: input.name,
    email: input.email,
    password: hashed,
    role: input.role,
    isActive: true,
    teamId: input.teamId,
  })
  const saved = await repository.save(user)

  return toPlain({
    id: saved.id,
    name: saved.name,
    email: saved.email,
    role: saved.role,
    isActive: saved.isActive,
    createdAt: saved.createdAt,
  })
}

export interface UpdateClubUserInput {
  isActive?: boolean
  role?: 'ADMIN' | 'OBSERVATEUR'
  password?: string
}

/**
 * TS-53 (avancement.md, Epic E17): delegates to identity, owner of User,
 * rather than writing the shared table directly.
 */
export async function updateClubUser(id: string, input: UpdateClubUserInput): Promise<ClubUser> {
  try {
    const user = await updateIdentityUser(id, input)
    return toPlain({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'ADMIN' | 'OBSERVATEUR',
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
