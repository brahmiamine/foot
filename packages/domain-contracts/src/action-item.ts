export type ActionItemPriority = "NORMAL" | "DUE_SOON" | "OVERDUE" | "ESCALATED";

export interface ActionItemScope {
  teamId?: string;
  federationId?: string;
  leagueId?: string | null;
}

export interface ActionItem {
  id: string;
  domain: string;
  entityId: string;
  title: string;
  description?: string | null;
  href: string;
  requestedAt: string;
  dueAt?: string | null;
  priority: ActionItemPriority;
  scope: ActionItemScope;
}

export function sortActionItems(items: readonly ActionItem[]): ActionItem[] {
  const rank: Record<ActionItemPriority, number> = {
    ESCALATED: 3,
    OVERDUE: 2,
    DUE_SOON: 1,
    NORMAL: 0,
  };
  return [...items].sort((left, right) => {
    const priorityDiff = rank[right.priority] - rank[left.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(left.requestedAt).getTime() - new Date(right.requestedAt).getTime();
  });
}
