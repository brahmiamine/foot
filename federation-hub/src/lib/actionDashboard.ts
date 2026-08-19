import type { DataSource } from 'typeorm'
import { canAccessPlatform } from '../../../packages/auth-shared/src/roles'
import {
  sortActionItems,
  type ActionItem,
  type ActionItemPriority,
} from '../../../packages/domain-contracts/src/action-item'
import { hasRegulatoryPermission, type RegulatoryPermission } from './regulatoryPermissions'
import {
  getRegulatoryPendingQueue,
  type RegulatorySlaDomain,
  type RegulatorySlaQueueItem,
} from './regulatorySla'
import type { SsoUser } from './ssoSession'

type DomainConfig = {
  permission: RegulatoryPermission
  href: string
  title: string
}

const DOMAIN_CONFIG: Record<RegulatorySlaDomain, DomainConfig> = {
  CLUB_LICENSE: {
    permission: 'club_license.review',
    href: '/admin/club-licensing',
    title: 'Licence club à examiner',
  },
  COMPETITION_ENTRY: {
    permission: 'competition_registration.review',
    href: '/admin/competition-entries',
    title: 'Engagement compétition à examiner',
  },
  DISCIPLINE: {
    permission: 'discipline.manage',
    href: '/admin/discipline',
    title: 'Dossier disciplinaire à traiter',
  },
  APPEAL: {
    permission: 'appeal.manage',
    href: '/admin/appeals',
    title: 'Appel à traiter',
  },
  INSURANCE: {
    permission: 'insurance.review',
    href: '/admin/federal-operations?domain=insurance',
    title: 'Assurance à examiner',
  },
  GRANT: {
    permission: 'grant.review',
    href: '/admin/federal-operations?domain=grants',
    title: 'Subvention à examiner',
  },
  DOCUMENT_COMPLIANCE: {
    permission: 'document_compliance.review',
    href: '/admin/federal-operations?domain=documents',
    title: 'Document réglementaire à examiner',
  },
}

function priorityOf(item: RegulatorySlaQueueItem): ActionItemPriority {
  if (item.state === 'ESCALATION_DUE') return 'ESCALATED'
  if (item.state === 'OVERDUE') return 'OVERDUE'
  if (item.state === 'DUE_SOON') return 'DUE_SOON'
  return 'NORMAL'
}

function toActionItem(item: RegulatorySlaQueueItem): ActionItem {
  const config = DOMAIN_CONFIG[item.domain]
  return {
    id: `regulatory:${item.domain}:${item.entityId}`,
    domain: `REGULATORY_${item.domain}`,
    entityId: item.entityId,
    title: config.title,
    description: `${item.label} · en attente depuis ${item.hoursPending} h`,
    href: config.href,
    requestedAt: new Date(item.pendingSince).toISOString(),
    dueAt: item.dueAt.toISOString(),
    priority: priorityOf(item),
    scope: {
      federationId: item.federationId,
      leagueId: item.leagueId,
    },
  }
}

async function pendingForActor(
  source: DataSource,
  session: SsoUser,
): Promise<RegulatorySlaQueueItem[]> {
  if (session.federationId) {
    return getRegulatoryPendingQueue(source, session)
  }
  if (!canAccessPlatform(session)) return []

  const federations = await source.query(
    'SELECT id FROM federations WHERE is_active = 1 ORDER BY name ASC',
  ) as Array<{ id: string }>
  const queues = await Promise.all(
    federations.map((federation) =>
      getRegulatoryPendingQueue(source, session, federation.id),
    ),
  )
  return queues.flat()
}

export async function getFederationActionDashboard(
  source: DataSource,
  session: SsoUser,
): Promise<ActionItem[]> {
  const pending = await pendingForActor(source, session)
  const permissionCache = new Map<RegulatoryPermission, boolean>()
  const canReview = async (permission: RegulatoryPermission): Promise<boolean> => {
    if (!permissionCache.has(permission)) {
      permissionCache.set(permission, await hasRegulatoryPermission(source, session, permission))
    }
    return permissionCache.get(permission) ?? false
  }

  const items: ActionItem[] = []
  for (const item of pending) {
    if (await canReview(DOMAIN_CONFIG[item.domain].permission)) {
      items.push(toActionItem(item))
    }
  }
  return sortActionItems(items)
}
