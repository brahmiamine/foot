import { canAccessFederation, canAccessLeague, canAccessPlatform } from './adminAuth'
import { getDataSource } from './db'
import { Arbitre, Match, type RefereeOfficialEvaluation } from './entities'
import { listMatchOfficials } from './matchOfficialClient'
import { getMatchScope } from './matchFederationScope'
import type { SsoUser } from './ssoSession'

export class RefereeAssessmentAuthorizationError extends Error {
  constructor(message: string, readonly status = 403) {
    super(message)
    this.name = 'RefereeAssessmentAuthorizationError'
  }
}

export function assessmentScopeForSession(session: SsoUser) {
  if (session.role === 'LEAGUE_ADMIN') return { leagueId: session.leagueId }
  if (session.role === 'FEDERATION_ADMIN') return { federationId: session.federationId }
  return {}
}

function canAccessScope(session: SsoUser, scope: { federationId: string; leagueId: string }): boolean {
  return (
    canAccessPlatform(session) ||
    canAccessFederation(session, scope.federationId) ||
    canAccessLeague(session, scope.leagueId, scope.federationId)
  )
}

export async function authorizeAssessmentCreation(
  session: SsoUser,
  matchId: string,
  refereeId: string,
): Promise<{ federationId: string; leagueId: string }> {
  const ds = await getDataSource()
  const [match, referee, scope] = await Promise.all([
    ds.getRepository(Match).findOne({ where: { id: matchId } }),
    ds.getRepository(Arbitre).findOne({ where: { id: refereeId } }),
    getMatchScope(ds, matchId),
  ])
  if (!match) throw new RefereeAssessmentAuthorizationError('Match introuvable', 404)
  if (!referee) throw new RefereeAssessmentAuthorizationError('Arbitre introuvable', 404)
  if (!scope) throw new RefereeAssessmentAuthorizationError('Le match ne possède pas de scope fédération/ligue valide', 400)

  const assignments = await listMatchOfficials(matchId)
  const refereeIsAssigned = assignments.some(
    (assignment) => assignment.status === 'ACTIVE' && assignment.refereeId === refereeId,
  )
  if (!refereeIsAssigned) {
    throw new RefereeAssessmentAuthorizationError("L'arbitre n'est pas désigné sur ce match")
  }

  if (session.role === 'REFEREE_OBSERVER') {
    const observerIsAssigned = assignments.some(
      (assignment) =>
        assignment.status === 'ACTIVE' &&
        assignment.userId === session.id &&
        assignment.role === 'REFEREE_OBSERVER',
    )
    if (!observerIsAssigned) {
      throw new RefereeAssessmentAuthorizationError("L'observateur n'est pas affecté à ce match")
    }
  } else if (!canAccessScope(session, scope)) {
    throw new RefereeAssessmentAuthorizationError('Accès hors périmètre')
  }

  return scope
}

export function authorizeAssessmentResource(
  session: SsoUser,
  evaluation: RefereeOfficialEvaluation,
  action: 'read' | 'edit' | 'submit' | 'review',
): void {
  if (session.role === 'REFEREE_OBSERVER') {
    if (action === 'review' || evaluation.observer_user_id !== session.id) {
      throw new RefereeAssessmentAuthorizationError('Accès interdit')
    }
    return
  }

  if ((action === 'edit' || action === 'submit') && !canAccessPlatform(session)) {
    throw new RefereeAssessmentAuthorizationError('Seul l’auteur du rapport peut le modifier ou le soumettre')
  }

  if (!canAccessScope(session, { federationId: evaluation.federation_id, leagueId: evaluation.league_id })) {
    throw new RefereeAssessmentAuthorizationError('Accès hors périmètre')
  }
}
