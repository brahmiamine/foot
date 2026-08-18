export type ManualReviewSlaState =
  | 'IN_SLA'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'ESCALATED'
  | 'UNSCHEDULED'

export interface ManualReviewDashboardItem {
  refundId: string
  paymentId: string
  orderId: string | null
  consumerApplication: string
  provider: string
  amount: string
  currency: string
  reason: string
  manualReviewReason: string | null
  policyVersion: number | null
  startedAt: string | null
  reminderAt: string | null
  reminderSentAt: string | null
  dueAt: string | null
  escalateAt: string | null
  escalatedAt: string | null
  state: ManualReviewSlaState
  minutesToDue: number | null
}

export interface ManualReviewDashboard {
  generatedAt: string
  summary: {
    total: number
    inSla: number
    dueSoon: number
    overdue: number
    escalated: number
    unscheduled: number
  }
  items: ManualReviewDashboardItem[]
}

export interface ManualReviewPolicy {
  consumerApplication: string
  slaMinutes: number
  reminderBeforeDueMinutes: number
  escalationAfterDueMinutes: number
  version: number
  source?: 'DEFAULT' | 'PERSISTED'
}

export interface UpdateManualReviewPolicyInput {
  slaMinutes: number
  reminderBeforeDueMinutes: number
  escalationAfterDueMinutes: number
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.PAYMENT_API_URL
  const apiKey = process.env.PAYMENT_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('PAYMENT_API_URL et PAYMENT_API_KEY doivent être configurés pour administrer les remboursements.')
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey }
}

async function paymentsRequest<T>(
  path: string,
  options: RequestInit = {},
  operatorUserId?: string,
): Promise<T> {
  const { baseUrl, apiKey } = getConfig()
  const headers = new Headers(options.headers)
  headers.set('x-api-key', apiKey)
  if (operatorUserId) headers.set('x-operator-user-id', operatorUserId)
  if (options.body) headers.set('content-type', 'application/json')

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Payments ${response.status}: ${body || 'erreur inconnue'}`)
  }
  return (await response.json()) as T
}

export function getManualReviewDashboard(): Promise<ManualReviewDashboard> {
  return paymentsRequest('/refund-manual-review/dashboard')
}

export function getManualReviewPolicy(
  consumerApplication: string,
): Promise<ManualReviewPolicy> {
  return paymentsRequest(
    `/refund-manual-review/policies/${encodeURIComponent(consumerApplication)}`,
  )
}

export function updateManualReviewPolicy(
  consumerApplication: string,
  input: UpdateManualReviewPolicyInput,
  operatorUserId: string,
): Promise<ManualReviewPolicy> {
  return paymentsRequest(
    `/refund-manual-review/policies/${encodeURIComponent(consumerApplication)}`,
    { method: 'PUT', body: JSON.stringify(input) },
    operatorUserId,
  )
}

export function resolveManualRefund(
  refundId: string,
  action: 'confirm' | 'reject',
  note: string,
  operatorUserId: string,
): Promise<unknown> {
  return paymentsRequest(
    `/refunds/${encodeURIComponent(refundId)}/${action}`,
    { method: 'POST', body: JSON.stringify({ note }) },
    operatorUserId,
  )
}
