import type { RefereeAvailabilityPort } from '../../../../packages/domain-contracts/src/referee-availability'
import { RefereeHttpClient } from '../../../../packages/referee-client/src'
import { SharedDatabaseRefereeAvailabilityAdapter } from './SharedDatabaseRefereeAvailabilityAdapter'

/**
 * Transitional composition root.
 *
 * - neither variable configured: keep legacy shared-DB behaviour;
 * - both configured: use referee-hub as the owner of the decision;
 * - partial configuration: fail closed rather than silently bypassing the
 *   service boundary.
 */
export function createRefereeAvailabilityAdapter(
  env: NodeJS.ProcessEnv = process.env,
): RefereeAvailabilityPort {
  const baseUrl = env.REFEREE_HUB_URL
  const apiKey = env.REFEREE_HUB_SERVICE_API_KEY

  if (!baseUrl && !apiKey) return new SharedDatabaseRefereeAvailabilityAdapter()

  if (!baseUrl || !apiKey) {
    throw new Error(
      'REFEREE_HUB_URL and REFEREE_HUB_SERVICE_API_KEY must be configured together',
    )
  }

  return new RefereeHttpClient({ baseUrl, apiKey })
}
