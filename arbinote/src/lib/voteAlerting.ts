/**
 * Système d'alertes automatiques pour les admins
 * Crée des alertes quand un match dépasse un seuil d'anomalie
 */

import { In, FindOptionsWhere } from 'typeorm'
import { getDataSource } from './db'
import { VoteAlert, AlertType, AlertStatus } from './entities'
import { Vote, Match } from './entities'
import { detectVoteAnomalies, calculateVoteCredibility } from './voteAnomalyDetection'
import { toPlainArray } from './serialization'
import { notify } from './notificationClient'

const CRITICAL_THRESHOLD = 0.7 // 70% de confiance = alerte critique
const IMPORTANT_THRESHOLD = 0.5 // 50% de confiance = alerte importante

/**
 * Crée ou met à jour une alerte pour un match si nécessaire
 * @param matchId - ID du match
 * @returns L'alerte créée/mise à jour ou null si pas de seuil dépassé
 */
export async function createOrUpdateVoteAlert(matchId: string): Promise<VoteAlert | null> {
  const dataSource = await getDataSource()
  const voteRepo = dataSource.getRepository<Vote>('votes')
  const matchRepo = dataSource.getRepository<Match>('matches')
  const alertRepo = dataSource.getRepository<VoteAlert>('vote_alerts')

  // Récupérer le match
  const match = await matchRepo.findOne({
    where: { id: matchId },
    select: ['id', 'date'],
  })

  if (!match) {
    return null
  }

  // Récupérer tous les votes du match
  const votes = await voteRepo.find({
    where: { match_id: matchId },
    select: ['note_globale', 'created_at', 'device_fingerprint', 'ip_address'],
    order: { created_at: 'ASC' },
  })

  // Si moins de 5 votes, pas d'alerte
  if (votes.length < 5) {
    return null
  }

  // Préparer les données pour l'analyse
  const votesForAnalysis = toPlainArray(votes).map((v) => ({
    note_globale: typeof v.note_globale === 'string'
      ? parseFloat(v.note_globale)
      : Number(v.note_globale),
    created_at: v.created_at || new Date(),
    device_fingerprint: v.device_fingerprint || null,
    ip_address: v.ip_address || null,
  }))

  // Détecter les anomalies
  const anomaly = detectVoteAnomalies(votesForAnalysis, match.date)
  const credibility = calculateVoteCredibility(votesForAnalysis, match.date)

  // Déterminer le type d'alerte
  let alertType: AlertType | null = null
  if (anomaly.confidence >= CRITICAL_THRESHOLD) {
    alertType = 'critical'
  } else if (anomaly.confidence >= IMPORTANT_THRESHOLD) {
    alertType = 'important'
  }

  // Si pas de seuil dépassé, pas d'alerte
  if (!alertType) {
    return null
  }

  // Vérifier si une alerte existe déjà pour ce match (statut new ou reviewed)
  const existingAlert = await alertRepo.findOne({
    where: {
      match_id: matchId,
      status: In(['new', 'reviewed']),
    },
  })

  if (existingAlert) {
    // Mettre à jour l'alerte existante si la situation s'aggrave
    if (anomaly.confidence > existingAlert.confidence) {
      // Capturer l'ancien type AVANT de l'écraser : sinon la comparaison plus bas
      // se ferait contre la nouvelle valeur (déjà égale à `alertType`) et ne se
      // déclencherait donc jamais.
      const wasImportant = existingAlert.alert_type === 'important'
      existingAlert.alert_type = alertType
      existingAlert.confidence = Math.round(anomaly.confidence * 10000) / 10000
      existingAlert.credibility = Math.round(credibility * 100) / 100
      existingAlert.reasons = anomaly.reasons
      // Si passe de important à critical, remettre en statut new
      if (alertType === 'critical' && wasImportant) {
        existingAlert.status = 'new'
      }
      await alertRepo.save(existingAlert)
      if (alertType === 'critical' && wasImportant) {
        await notifyCriticalVoteAlert(existingAlert.id, matchId, existingAlert.confidence)
      }
      return existingAlert
    }
    // Si la situation s'améliore mais reste au-dessus du seuil, on garde l'alerte
    return existingAlert
  }

  // Créer une nouvelle alerte
  const alert = alertRepo.create({
    match_id: matchId,
    alert_type: alertType,
    confidence: Math.round(anomaly.confidence * 10000) / 10000,
    credibility: Math.round(credibility * 100) / 100,
    reasons: anomaly.reasons,
    status: 'new',
  })

  await alertRepo.save(alert)
  if (alertType === 'critical') {
    await notifyCriticalVoteAlert(alert.id, matchId, alert.confidence)
  }
  return alert
}

/**
 * Notifie les SUPERADMIN (toutes fédérations confondues) via notification-api
 * quand une alerte atteint le niveau critique — jamais pour les alertes
 * "important", pour ne pas noyer les admins. Idempotent par `alertId` : une
 * alerte déjà critique ne renotifie pas à chaque recalcul de confiance.
 * N'a aucun effet si NOTIFICATION_API_URL/NOTIFICATION_API_KEY ne sont pas
 * configurés.
 */
async function notifyCriticalVoteAlert(alertId: string, matchId: string, confidence: number): Promise<void> {
  const dataSource = await getDataSource()
  const matchRepo = dataSource.getRepository<Match>('matches')
  const match = await matchRepo.findOne({
    where: { id: matchId },
    relations: ['arbitre'],
  })
  const arbitreName = match?.arbitre?.nom ?? 'un arbitre'

  await notify({
    eventId: `vote-anomaly:${alertId}:critical`,
    type: 'VOTE_ANOMALY_DETECTED',
    target: { type: 'ROLE', role: 'SUPERADMIN' },
    category: 'VOTE_ANOMALY_DETECTED',
    title: 'Anomalie de vote détectée',
    body: `Une anomalie critique a été détectée sur les votes de ${arbitreName}.`,
    data: {
      matchId,
      arbitreName,
      suspicionScore: Math.round(confidence * 100),
    },
  })
}

/**
 * Récupère le nombre d'alertes non traitées
 */
export async function getUnresolvedAlertsCount(): Promise<number> {
  try {
    const dataSource = await getDataSource()
    const alertRepo = dataSource.getRepository<VoteAlert>('vote_alerts')
    
    return await alertRepo.count({
      where: {
        status: In(['new', 'reviewed']),
      },
    })
  } catch (error) {
    // Si la table n'existe pas, retourner 0
    console.warn('Error getting unresolved alerts count (table may not exist):', error)
    return 0
  }
}

/**
 * Récupère les alertes avec filtres
 */
export async function getAlerts(options: {
  status?: AlertStatus
  alertType?: AlertType
  limit?: number
  offset?: number
} = {}): Promise<{ alerts: VoteAlert[]; total: number }> {
  try {
    const dataSource = await getDataSource()
    const alertRepo = dataSource.getRepository<VoteAlert>('vote_alerts')

    const where: FindOptionsWhere<VoteAlert> = {}
    if (options.status) {
      where.status = options.status
    }
    if (options.alertType) {
      where.alert_type = options.alertType
    }

    const [alerts, total] = await alertRepo.findAndCount({
      where,
      relations: ['match'],
      order: { created_at: 'DESC' },
      take: options.limit || 50,
      skip: options.offset || 0,
    })

    return { alerts, total }
  } catch (error) {
    // Si la table n'existe pas, retourner un tableau vide
    console.warn('Error getting alerts (table may not exist):', error)
    return { alerts: [], total: 0 }
  }
}

