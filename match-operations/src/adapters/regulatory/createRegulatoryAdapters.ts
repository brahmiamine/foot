import { SharedDatabaseEligibilityAdapter } from '@/adapters/regulatory/SharedDatabaseEligibilityAdapter'
import { SharedDatabaseStaffQualificationAdapter } from '@/adapters/regulatory/SharedDatabaseStaffQualificationAdapter'
import { RegulatoryHttpClient } from '../../../../packages/regulatory-client/src/index'
import type { EligibilityServicePort } from '../../../../packages/domain-contracts/src/eligibility'
import type { StaffQualificationServicePort } from '../../../../packages/domain-contracts/src/staff-eligibility'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'

function createHttpClientFromEnvironment(env: NodeJS.ProcessEnv): RegulatoryHttpClient | null {
  const baseUrl = env.FEDERATION_REGULATORY_URL
  const apiKey = env.FEDERATION_REGULATORY_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'match-operations->federation-regulatory',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  return mode === 'http' ? new RegulatoryHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! }) : null
}

export function createPlayerEligibilityPort(
  env: NodeJS.ProcessEnv = process.env,
): EligibilityServicePort {
  return createHttpClientFromEnvironment(env) ?? new SharedDatabaseEligibilityAdapter()
}

export function createStaffQualificationPort(
  env: NodeJS.ProcessEnv = process.env,
): StaffQualificationServicePort {
  return createHttpClientFromEnvironment(env) ?? new SharedDatabaseStaffQualificationAdapter()
}
