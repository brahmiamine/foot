import { describe, expect, it } from 'vitest'
import {
  resolveClubPermissionScopeProjection,
  resolveClubRbacProjection,
  type ClubDelegationSnapshot,
  type ClubRbacIdentitySnapshot,
  type ClubRoleGrantSnapshot,
} from '../../../../packages/domain-contracts/src/club-access'

const at = new Date('2026-08-20T14:00:00.000Z')

function identity(userId: string, patch: Partial<ClubRbacIdentitySnapshot> = {}): ClubRbacIdentitySnapshot {
  return { userId, isActive: true, isClubAdmin: false, ...patch }
}

function direct(
  userId: string,
  permissions: string[],
  patch: Partial<ClubRoleGrantSnapshot> = {},
): ClubRoleGrantSnapshot {
  return {
    userId,
    permissions,
    isGlobal: false,
    category: 'u17',
    validFrom: null,
    validUntil: null,
    revokedAt: null,
    ...patch,
  }
}

function delegation(
  delegatorUserId: string,
  delegateeUserId: string,
  permissions: string[],
  patch: Partial<ClubDelegationSnapshot> = {},
): ClubDelegationSnapshot {
  return {
    delegatorUserId,
    delegateeUserId,
    permissions,
    category: 'u17',
    validFrom: new Date('2026-08-20T13:00:00.000Z'),
    validUntil: new Date('2026-08-20T15:00:00.000Z'),
    revokedAt: null,
    ...patch,
  }
}

describe('CLUB-012 shared RBAC projection', () => {
  it('drops expired and revoked direct grants', () => {
    const result = resolveClubRbacProjection({
      userId: 'target',
      identities: [identity('target')],
      directGrants: [
        direct('target', ['trainings.view']),
        direct('target', ['medical.view'], { validUntil: at }),
        direct('target', ['discipline.view'], { revokedAt: new Date('2026-08-20T13:30:00.000Z') }),
      ],
      delegations: [],
      at,
    })

    expect(result.permissions).toEqual(['trainings.view'])
    expect(result.categories).toEqual(['u17'])
  })

  it('applies a delegation only while the delegator still owns the permission directly', () => {
    const active = resolveClubRbacProjection({
      userId: 'delegatee',
      identities: [identity('delegatee'), identity('delegator')],
      directGrants: [direct('delegator', ['trainings.view', 'roles.manage'])],
      delegations: [delegation('delegator', 'delegatee', ['trainings.view'])],
      at,
    })
    expect(active.permissions).toContain('trainings.view')

    const sourceExpired = resolveClubRbacProjection({
      userId: 'delegatee',
      identities: [identity('delegatee'), identity('delegator')],
      directGrants: [direct('delegator', ['trainings.view'], { validUntil: at })],
      delegations: [delegation('delegator', 'delegatee', ['trainings.view'])],
      at,
    })
    expect(sourceExpired.permissions).not.toContain('trainings.view')
  })

  it('does not allow transitive re-delegation', () => {
    const result = resolveClubRbacProjection({
      userId: 'third',
      identities: [identity('owner'), identity('middle'), identity('third')],
      directGrants: [direct('owner', ['trainings.view'])],
      delegations: [
        delegation('owner', 'middle', ['trainings.view']),
        delegation('middle', 'third', ['trainings.view']),
      ],
      at,
    })

    expect(result.permissions).not.toContain('trainings.view')
  })

  it('keeps category-specific permission scope and honors an intrinsic ADMIN source', () => {
    const result = resolveClubPermissionScopeProjection(
      {
        userId: 'delegatee',
        identities: [identity('delegatee'), identity('admin', { isClubAdmin: true })],
        directGrants: [],
        delegations: [delegation('admin', 'delegatee', ['matchOperations.sign'], { category: 'u19' })],
        at,
      },
      'matchOperations.sign',
    )

    expect(result).toEqual(['u19'])
  })

  it('fails closed for an inactive target user', () => {
    const result = resolveClubRbacProjection({
      userId: 'target',
      identities: [identity('target', { isActive: false })],
      directGrants: [direct('target', ['trainings.view'])],
      delegations: [],
      at,
    })

    expect(result).toEqual({ permissions: [], categories: [] })
  })
})
