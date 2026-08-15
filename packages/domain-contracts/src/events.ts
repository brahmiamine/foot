export interface DomainActor {
  userId?: string | null
  role?: string | null
  teamId?: string | null
  federationId?: string | null
  leagueId?: string | null
}

export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  id: string
  type: TType
  occurredAt: string
  aggregateType: string
  aggregateId: string
  correlationId?: string | null
  causationId?: string | null
  actor?: DomainActor | null
  payload: TPayload
}

export function createDomainEvent<TType extends string, TPayload>(input: {
  id: string
  type: TType
  occurredAt?: Date | string
  aggregateType: string
  aggregateId: string
  correlationId?: string | null
  causationId?: string | null
  actor?: DomainActor | null
  payload: TPayload
}): DomainEvent<TType, TPayload> {
  const occurredAt = input.occurredAt ?? new Date()
  return {
    id: input.id,
    type: input.type,
    occurredAt: occurredAt instanceof Date ? occurredAt.toISOString() : occurredAt,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
    actor: input.actor ?? null,
    payload: input.payload,
  }
}
