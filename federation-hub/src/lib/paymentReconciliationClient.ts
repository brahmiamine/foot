export type PaymentReconciliationCaseStatus = 'OPEN' | 'RESOLVED'
export type PaymentReconciliationResolutionAction = 'ACCEPT_INTERNAL' | 'DOCUMENT_EXCEPTION' | 'AUTO_MATCH'

export interface PaymentReconciliationCase {
  id: string
  paymentId: string
  provider: 'konnect' | 'paymee' | 'flouci'
  consumerApplication: string | null
  status: PaymentReconciliationCaseStatus
  discrepancyType:
    | 'STALE_PENDING'
    | 'STATUS_MISMATCH'
    | 'PROVIDER_CHECK_FAILED'
    | 'PROVIDER_EVIDENCE_UNAVAILABLE'
    | 'MISSING_PROVIDER_REFERENCE'
  evidenceSource: 'LIVE_PROVIDER_API' | 'SIGNED_WEBHOOK' | 'NONE'
  internalStatus: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'
  providerStatus: string | null
  mappedProviderStatus: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | null
  fingerprint: string
  detail: string | null
  detectedAt: string
  lastCheckedAt: string
  checkCount: number
  resolvedAt: string | null
  resolutionAction: PaymentReconciliationResolutionAction | null
  resolvedByApplication: string | null
  resolvedByUser: string | null
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentReconciliationEvent {
  id: string
  caseId: string
  action: 'OPENED' | 'REOPENED' | 'CHECKED' | 'RECHECKED' | 'RESOLVED' | 'AUTO_RESOLVED'
  actorApplication: string
  actorUser: string | null
  ipAddress: string | null
  userAgent: string | null
  note: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  createdAt: string
}

export interface PaymentReconciliationBundle {
  reconciliationCase: PaymentReconciliationCase
  events: PaymentReconciliationEvent[]
}

export interface PaymentReconciliationReport {
  staleCount: number
  resolvedCount: number
  stillPendingCount: number
  openCaseCount: number
  timestamp: string
}

export interface PaymentReconciliationFilters {
  status?: PaymentReconciliationCaseStatus
  provider?: 'konnect' | 'paymee' | 'flouci'
  consumerApplication?: string
  limit?: number
}

interface OperatorContext {
  userId: string
  ipAddress?: string | null
  userAgent?: string | null
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.PAYMENT_API_URL
  const apiKey = process.env.PAYMENT_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour la réconciliation financière.')
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey }
}

function serviceHeaders(operator?: OperatorContext): HeadersInit {
  const { apiKey } = getConfig()
  const headers: Record<string, string> = { 'x-api-key': apiKey }
  if (operator) {
    headers['x-operator-user-id'] = operator.userId
    if (operator.ipAddress) headers['x-operator-ip'] = operator.ipAddress
    if (operator.userAgent) headers['x-operator-user-agent'] = operator.userAgent
  }
  return headers
}

async function ensureOk(response: Response, operation: string): Promise<void> {
  if (response.ok) return
  const body = await response.text().catch(() => '')
  throw new Error(`${operation} (payments ${response.status}): ${body}`)
}

export async function listPaymentReconciliationCases(
  filters: PaymentReconciliationFilters = {},
): Promise<PaymentReconciliationCase[]> {
  const { baseUrl } = getConfig()
  const query = new URLSearchParams()
  if (filters.status) query.set('status', filters.status)
  if (filters.provider) query.set('provider', filters.provider)
  if (filters.consumerApplication) query.set('consumerApplication', filters.consumerApplication)
  if (filters.limit) query.set('limit', String(filters.limit))
  const response = await fetch(`${baseUrl}/payment-reconciliation/cases?${query}`, {
    headers: serviceHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  await ensureOk(response, 'Impossible de charger les écarts de paiement')
  return (await response.json()) as PaymentReconciliationCase[]
}

export async function getPaymentReconciliationCase(
  id: string,
): Promise<PaymentReconciliationBundle> {
  const { baseUrl } = getConfig()
  const response = await fetch(`${baseUrl}/payment-reconciliation/cases/${encodeURIComponent(id)}`, {
    headers: serviceHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  await ensureOk(response, 'Impossible de charger le dossier de réconciliation')
  return (await response.json()) as PaymentReconciliationBundle
}

export async function scanPaymentReconciliation(
  operator: OperatorContext,
): Promise<PaymentReconciliationReport> {
  const { baseUrl } = getConfig()
  const response = await fetch(`${baseUrl}/payment-reconciliation/scan`, {
    method: 'POST',
    headers: serviceHeaders(operator),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  await ensureOk(response, 'Impossible de lancer la réconciliation')
  return (await response.json()) as PaymentReconciliationReport
}

export async function recheckPaymentReconciliationCase(
  id: string,
  operator: OperatorContext,
): Promise<PaymentReconciliationBundle> {
  const { baseUrl } = getConfig()
  const response = await fetch(
    `${baseUrl}/payment-reconciliation/cases/${encodeURIComponent(id)}/recheck`,
    {
      method: 'POST',
      headers: serviceHeaders(operator),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    },
  )
  await ensureOk(response, 'Impossible de recontrôler le paiement')
  return (await response.json()) as PaymentReconciliationBundle
}

export async function resolvePaymentReconciliationCase(
  id: string,
  action: Exclude<PaymentReconciliationResolutionAction, 'AUTO_MATCH'>,
  note: string,
  operator: OperatorContext,
): Promise<PaymentReconciliationCase> {
  const { baseUrl } = getConfig()
  const response = await fetch(
    `${baseUrl}/payment-reconciliation/cases/${encodeURIComponent(id)}/resolve`,
    {
      method: 'POST',
      headers: { ...serviceHeaders(operator), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    },
  )
  await ensureOk(response, 'Impossible de résoudre le dossier de réconciliation')
  return (await response.json()) as PaymentReconciliationCase
}
