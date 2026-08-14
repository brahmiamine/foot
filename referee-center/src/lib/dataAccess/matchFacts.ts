import { getDataSource } from '../db'
import { Goal } from '../entities/Goal'
import { Card, type MatchPeriod } from '../entities/Card'
import { Substitution } from '../entities/Substitution'
import { Injury } from '../entities/Injury'

export type MatchFactType = 'GOAL' | 'CARD' | 'SUBSTITUTION' | 'INJURY'

export interface MatchFact {
  id: string
  type: MatchFactType
  minute: number | null
  period: MatchPeriod | null
  teamId: string | null
  label: string
  detail?: string
  neutralized?: boolean
}

const PERIOD_ORDER: Record<MatchPeriod, number> = { H1: 0, H2: 1, ET1: 2, ET2: 3 }

function sortKey(period: MatchPeriod | null | undefined, minute: number | null | undefined): number {
  return (period ? PERIOD_ORDER[period] : 0) * 1000 + (minute ?? 0)
}

function playerName(player?: { firstNameFr: string; lastNameFr: string } | null): string {
  if (!player) return 'Joueur'
  return `${player.firstNameFr} ${player.lastNameFr}`
}

/**
 * Fusionne les faits de match (buts, cartons, blessures, remplacements)
 * saisis par `match-operations` en un fil chronologique unique, en lecture seule
 * (voir db/OWNERSHIP.md). Les buts/blessures/remplacements annulés sont
 * exclus ; les cartons neutralisés (double jaune, cumul) restent visibles
 * mais marqués `neutralized`, car ils restent un fait de match réel.
 */
export async function fetchMatchFacts(matchId: string): Promise<MatchFact[]> {
  const dataSource = await getDataSource()

  const [goals, cards, substitutions, injuries] = await Promise.all([
    dataSource.getRepository(Goal).find({ where: { matchId }, relations: ['player'] }),
    dataSource.getRepository(Card).find({ where: { matchId }, relations: ['player'] }),
    dataSource.getRepository(Substitution).find({ where: { matchId }, relations: ['playerOut', 'playerIn'] }),
    dataSource.getRepository(Injury).find({ where: { matchId }, relations: ['player'] }),
  ])

  const facts: MatchFact[] = []

  for (const goal of goals) {
    if (goal.cancelledAt) continue
    facts.push({
      id: `goal-${goal.id}`,
      type: 'GOAL',
      minute: goal.minute,
      period: goal.period,
      teamId: goal.teamId,
      label: goal.isOwnGoal ? `But contre son camp — ${playerName(goal.player)}` : `But — ${playerName(goal.player)}`,
      detail: goal.isPenalty ? 'Sur penalty' : undefined,
    })
  }

  for (const card of cards) {
    const label =
      card.type === 'RED'
        ? `Carton rouge — ${playerName(card.player)}`
        : card.type === 'DOUBLE_YELLOW'
          ? `Deuxième jaune (rouge) — ${playerName(card.player)}`
          : `Carton jaune — ${playerName(card.player)}`
    facts.push({
      id: `card-${card.id}`,
      type: 'CARD',
      minute: card.minute ?? null,
      period: card.period ?? null,
      teamId: null,
      label,
      neutralized: card.isNeutralized,
    })
  }

  for (const sub of substitutions) {
    if (sub.cancelledAt) continue
    facts.push({
      id: `sub-${sub.id}`,
      type: 'SUBSTITUTION',
      minute: sub.minute,
      period: sub.period,
      teamId: sub.teamId,
      label: `Remplacement — ${playerName(sub.playerIn)} entre, ${playerName(sub.playerOut)} sort`,
    })
  }

  for (const injury of injuries) {
    if (injury.cancelledAt) continue
    facts.push({
      id: `injury-${injury.id}`,
      type: 'INJURY',
      minute: injury.minute ?? null,
      period: injury.period ?? null,
      teamId: injury.teamId,
      label: `Blessure — ${playerName(injury.player)}`,
    })
  }

  return facts.sort((a, b) => sortKey(a.period, a.minute) - sortKey(b.period, b.minute))
}
