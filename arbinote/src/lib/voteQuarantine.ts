/**
 * ARBI-003 — quarantaine automatique des votes suspects.
 *
 * Contrairement à `voteFiltering.ts` (exclusion algorithmique, éphémère,
 * recalculée à chaque lecture, sans trace persistée), cette quarantaine
 * PERSISTE une décision sur `Vote.moderation_status` (nouvel état
 * `quarantined`), l'audite (GOV-005) et notifie les modérateurs humains —
 * jamais définitive : `federation-hub` peut ensuite valider ou exclure
 * explicitement le vote (voir POST .../votes/moderate/[voteId]).
 */
import { getDataSource } from './db'
import { ArbiNoteConfigurationAudit, Match, Vote } from './entities'
import { computeSuspiciousVoteIds, type VoteRow } from './voteFiltering'
import { detectVoteAnomalies } from './voteAnomalyDetection'
import { toPlainArray } from './serialization'
import { notify } from './notificationClient'

export interface QuarantineResult {
  quarantinedVoteIds: string[]
  confidence: number
  reasons: string[]
}

export async function quarantineSuspiciousVotes(
  matchId: string,
  confidenceThreshold: number,
): Promise<QuarantineResult> {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')
  const matchRepo = dataSource.getRepository<Match>('matches')
  const auditRepo = dataSource.getRepository(ArbiNoteConfigurationAudit)

  const match = await matchRepo.findOne({ where: { id: matchId }, select: ['id', 'date'] })
  if (!match) return { quarantinedVoteIds: [], confidence: 0, reasons: [] }

  const votes = await voteRepo.find({
    where: { match_id: matchId },
    select: ['id', 'note_globale', 'created_at', 'device_fingerprint', 'ip_address', 'moderation_status'],
    order: { created_at: 'ASC' },
  })
  if (votes.length < 5) return { quarantinedVoteIds: [], confidence: 0, reasons: [] }

  const plainVotes = toPlainArray(votes) as Array<VoteRow & { moderation_status?: string | null }>

  const votesForAnalysis = plainVotes.map((v) => ({
    note_globale: typeof v.note_globale === 'string' ? parseFloat(v.note_globale) : Number(v.note_globale),
    created_at: v.created_at || new Date(),
    device_fingerprint: v.device_fingerprint || null,
    ip_address: v.ip_address || null,
  }))
  const anomaly = detectVoteAnomalies(votesForAnalysis, match.date)

  if (anomaly.confidence < confidenceThreshold) {
    return { quarantinedVoteIds: [], confidence: anomaly.confidence, reasons: anomaly.reasons }
  }

  const suspiciousIds = computeSuspiciousVoteIds(plainVotes, match.date, confidenceThreshold)
  // Jamais écraser une décision humaine déjà prise (validated/excluded) —
  // seuls les votes encore `pending` peuvent basculer en quarantaine.
  const candidates = plainVotes.filter((v) => suspiciousIds.has(v.id) && (v.moderation_status ?? 'pending') === 'pending')
  if (candidates.length === 0) {
    return { quarantinedVoteIds: [], confidence: anomaly.confidence, reasons: anomaly.reasons }
  }

  const quarantinedVoteIds: string[] = []
  for (const candidate of candidates) {
    // Mise à jour conditionnelle sur le statut courant : protège contre une
    // course avec une décision humaine concurrente (federation-hub).
    const result = await voteRepo.update({ id: candidate.id, moderation_status: 'pending' } as never, {
      moderation_status: 'quarantined',
    } as never)
    if (result.affected !== 1) continue

    quarantinedVoteIds.push(candidate.id)
    await auditRepo.save(
      auditRepo.create({
        domain: 'ARBINOTE_VOTE_QUARANTINE',
        configurationKey: `vote:${candidate.id}`,
        scopeType: 'MATCH',
        scopeId: matchId,
        previousVersion: null,
        newVersion: null,
        before: { moderation_status: 'pending' },
        after: { moderation_status: 'quarantined', confidence: anomaly.confidence, reasons: anomaly.reasons },
        actorUserId: 'system:auto-quarantine',
        actorRole: 'SYSTEM',
        reason: `Quarantaine automatique (confiance ${Math.round(anomaly.confidence * 100)}% >= seuil ${Math.round(confidenceThreshold * 100)}%) : ${anomaly.reasons.join('; ') || 'anomalie statistique détectée'}`,
        ipAddress: null,
        userAgent: null,
      }),
    )
  }

  if (quarantinedVoteIds.length > 0) {
    await notify({
      eventId: `vote-quarantine:${matchId}:${[...quarantinedVoteIds].sort().join(',')}`,
      type: 'VOTE_AUTO_QUARANTINED',
      target: { type: 'ROLE', role: 'SUPERADMIN' },
      category: 'VOTE_ANOMALY_DETECTED',
      title: 'Votes mis en quarantaine automatiquement',
      body: `${quarantinedVoteIds.length} vote(s) suspect(s) ont été mis en quarantaine sur un match et attendent une revue humaine.`,
      data: { matchId, quarantinedCount: quarantinedVoteIds.length, confidence: Math.round(anomaly.confidence * 100) },
    })
  }

  return { quarantinedVoteIds, confidence: anomaly.confidence, reasons: anomaly.reasons }
}
