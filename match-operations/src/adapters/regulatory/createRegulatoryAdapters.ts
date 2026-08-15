import { SharedDatabaseEligibilityAdapter } from '@/adapters/regulatory/SharedDatabaseEligibilityAdapter'
import { SharedDatabaseStaffQualificationAdapter } from '@/adapters/regulatory/SharedDatabaseStaffQualificationAdapter'
import { RegulatoryHttpClient } from '../../../../packages/regulatory-client/src/index'
import type { EligibilityServicePort } from '../../../../packages/domain-contracts/src/eligibility'
import type { StaffQualificationServicePort } from '../../../../packages/domain-contracts/src/staff-eligibility'

function createHttpClientFromEnvironment(): RegulatoryHttpClient | null {
  const baseUrl = process.env.FEDERATION_REGULATORY_URL
  const apiKey = process.env.FEDERATION_REGULATORY_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return null
  if (!baseUrl || !apiKey) {
    throw new Error(
      'FEDERATION_REGULATORY_URL et FEDERATION_REGULATORY_SERVICE_API_KEY doivent être configurés ensemble',
    )
  }

  return new RegulatoryHttpClient({ baseUrl, apiKey })
}

/**
 * Transitional composition root.
 *
 * No configuration => keep the current shared-database implementation.
 * Both federation regulatory variables configured => use the HTTP boundary.
 * Partial configuration fails closed instead of silently mixing architectures.
 */
export function createPlayerEligibilityPort(): EligibilityServicePort {
  return createHttpClientFromEnvironment() ?? new SharedDatabaseEligibilityAdapter()
}

export function createStaffQualificationPort(): StaffQualificationServicePort {
  return createHttpClientFromEnvironment() ?? new SharedDatabaseStaffQualificationAdapter()
}
