import type {
  CreateIdentityAccountInput,
  EffectiveMemberRegistrationPolicy,
  IdentityAccountInvitationResult,
  IdentityAccountProvisioningPort,
  IdentityDirectoryPort,
  IdentityMemberRegistrationAdminPort,
  IdentityPlayerInvitationPort,
  IdentityProfilePort,
  IdentityUserProfile,
  IdentityUserRecord,
  IdentityUserSearch,
  InviteMemberInput,
  InviteMemberResult,
  InvitePlayerAccountInput,
  MemberRegistrationQueueItem,
  UpdateIdentityAccountInput,
  UpdateMemberRegistrationPolicyInput,
} from '../../domain-contracts/src/identity'

export interface IdentityClientOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
}

export class IdentityClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'IdentityClientError'
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '')
}

export class IdentityHttpClient
  implements
    IdentityDirectoryPort,
    IdentityAccountProvisioningPort,
    IdentityProfilePort,
    IdentityPlayerInvitationPort,
    IdentityMemberRegistrationAdminPort
{
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(private readonly options: IdentityClientOptions) {
    if (!options.baseUrl || !options.apiKey) {
      throw new IdentityClientError('Identity service URL and API key are required')
    }
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.timeoutMs = options.timeoutMs ?? 5_000
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.options.apiKey,
          ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'network error'
      throw new IdentityClientError(`Identity service unavailable: ${reason}`)
    }

    const body = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        body && typeof (body as { error?: unknown }).error === 'string'
          ? (body as { error: string }).error
          : `identity service responded ${response.status}`
      throw new IdentityClientError(message, response.status)
    }
    return body as T
  }

  async getUserById(id: string): Promise<IdentityUserRecord | null> {
    try {
      return await this.call<IdentityUserRecord>(`/api/internal/users/${encodeURIComponent(id)}`)
    } catch (error) {
      if (error instanceof IdentityClientError && error.status === 404) return null
      throw error
    }
  }

  async getUserProfile(id: string): Promise<IdentityUserProfile | null> {
    return this.getUserById(id)
  }

  async listUsers(search: IdentityUserSearch = {}): Promise<IdentityUserRecord[]> {
    const params = new URLSearchParams()
    if (search.teamId) params.set('teamId', search.teamId)
    if (search.roles?.length) params.set('roles', search.roles.join(','))
    if (search.hasTeam !== undefined) params.set('hasTeam', String(search.hasTeam))
    const suffix = params.size ? `?${params.toString()}` : ''
    const body = await this.call<{ users: IdentityUserRecord[] }>(
      `/api/internal/users/search${suffix}`,
    )
    return body.users
  }

  async getUserByEmail(email: string): Promise<IdentityUserRecord | null> {
    try {
      return await this.call<IdentityUserRecord>(
        `/api/internal/users?email=${encodeURIComponent(email)}`,
      )
    } catch (error) {
      if (error instanceof IdentityClientError && error.status === 404) return null
      throw error
    }
  }

  createUser(input: CreateIdentityAccountInput): Promise<IdentityUserRecord> {
    return this.call<IdentityUserRecord>('/api/internal/users', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  updateUser(id: string, input: UpdateIdentityAccountInput): Promise<IdentityUserRecord> {
    return this.call<IdentityUserRecord>(`/api/internal/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  async deleteUser(id: string): Promise<void> {
    await this.call<unknown>(`/api/internal/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  invitePlayerAccount(input: InvitePlayerAccountInput): Promise<IdentityAccountInvitationResult> {
    return this.call<IdentityAccountInvitationResult>('/api/internal/users/invite-player', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  getMemberRegistrationPolicy(teamId: string): Promise<EffectiveMemberRegistrationPolicy> {
    return this.call<EffectiveMemberRegistrationPolicy>(
      `/api/internal/member-registration/policy?teamId=${encodeURIComponent(teamId)}`,
    )
  }

  updateMemberRegistrationPolicy(
    input: UpdateMemberRegistrationPolicyInput,
  ): Promise<EffectiveMemberRegistrationPolicy> {
    return this.call<EffectiveMemberRegistrationPolicy>('/api/internal/member-registration/policy', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  listPendingMemberRegistrations(teamId: string): Promise<MemberRegistrationQueueItem[]> {
    return this.call<MemberRegistrationQueueItem[]>(
      `/api/internal/member-registration/requests?teamId=${encodeURIComponent(teamId)}`,
    )
  }

  async approveMemberRegistration(teamId: string, requestId: string, actorUserId: string): Promise<void> {
    await this.call(`/api/internal/member-registration/requests/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ teamId, actorUserId }),
    })
  }

  async rejectMemberRegistration(
    teamId: string,
    requestId: string,
    actorUserId: string,
    reason: string,
  ): Promise<void> {
    await this.call(`/api/internal/member-registration/requests/${encodeURIComponent(requestId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ teamId, actorUserId, reason }),
    })
  }

  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult> {
    return this.call<InviteMemberResult>('/api/internal/member-registration/invitations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }
}