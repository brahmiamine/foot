import type { ArbiNoteVotingPolicyValues } from './entities/ArbiNoteVotingPolicy'

export const DEFAULT_VOTING_POLICY: ArbiNoteVotingPolicyValues = {
  votingMode: 'ANONYMOUS',
  voteOpenMinutesAfterStart: 30,
  voteCloseHoursAfterMatch: null,
  minimumVotesBeforeScoreVisible: 1,
  quarantineConfidenceThreshold: 0.7,
}

export interface VotingEligibilityMatch {
  arbitreId?: string | null
  status?: 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | null
  actualStartedAt?: string | Date | null
  homeTeamId: string
  awayTeamId: string
}

export interface VotingEligibilityVoter {
  isAuthenticatedMember: boolean
  /** L'utilisateur authentifié est-il membre d'un des deux clubs de ce match (JWT `teamId`) ? */
  isClubMember: boolean
  /** L'utilisateur authentifié a-t-il une vérification MFA récente ? */
  isVerified: boolean
}

/**
 * ARBI-001 — fenêtre de vote (ouverture/fermeture) et mode d'éligibilité
 * (anonyme/membres/vérifié) résolus depuis la policy en vigueur. Le mode
 * ANONYMOUS conserve le comportement historique (aucune restriction
 * d'identité au-delà du fingerprint+consentement déjà exigés côté route).
 * Fonction pure, testable sans DB (mirrors `canVoteMatch` dans utils.ts,
 * qu'elle remplace pour la fenêtre temporelle).
 */
export function resolveVotingEligibility(
  policy: ArbiNoteVotingPolicyValues,
  match: VotingEligibilityMatch,
  voter: VotingEligibilityVoter,
  now: Date = new Date(),
): string | null {
  if (!match.arbitreId) return 'Aucun arbitre n\'est attribué à ce match'
  if (match.status !== 'IN_PROGRESS' && match.status !== 'FINISHED') {
    return 'Le vote n\'est ouvert que pour un match en cours ou terminé'
  }

  let minutesSinceStart: number | null = null
  if (match.actualStartedAt) {
    const startedAt = typeof match.actualStartedAt === 'string' ? new Date(match.actualStartedAt) : match.actualStartedAt
    minutesSinceStart = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60))
  } else if (match.status !== 'FINISHED') {
    return 'Le vote n\'est pas encore ouvert pour ce match'
  }

  if (minutesSinceStart !== null) {
    if (minutesSinceStart < policy.voteOpenMinutesAfterStart) {
      return `Le vote ouvre ${policy.voteOpenMinutesAfterStart} minutes après le début du match`
    }
    if (policy.voteCloseHoursAfterMatch != null && minutesSinceStart > policy.voteCloseHoursAfterMatch * 60) {
      return `Le vote est fermé ${policy.voteCloseHoursAfterMatch} heures après le début du match`
    }
  }

  if (policy.votingMode === 'MEMBERS') {
    if (!voter.isAuthenticatedMember || !voter.isClubMember) {
      return 'Le vote sur ce match est réservé aux membres des clubs concernés'
    }
  } else if (policy.votingMode === 'VERIFIED') {
    if (!voter.isAuthenticatedMember || !voter.isVerified) {
      return 'Le vote sur ce match nécessite une identité vérifiée'
    }
  }

  return null
}

/** ARBI-002 — un score n'est publiquement visible qu'à partir du seuil configuré. */
export function isScorePubliclyVisible(
  voteCount: number,
  policy: Pick<ArbiNoteVotingPolicyValues, 'minimumVotesBeforeScoreVisible'>,
): boolean {
  return voteCount >= policy.minimumVotesBeforeScoreVisible
}

/** ARBI-003 — un vote suspect n'est mis en quarantaine automatiquement que s'il dépasse le seuil de confiance configuré. */
export function shouldQuarantineForConfidence(
  confidence: number,
  policy: Pick<ArbiNoteVotingPolicyValues, 'quarantineConfidenceThreshold'>,
): boolean {
  return confidence >= policy.quarantineConfidenceThreshold
}
