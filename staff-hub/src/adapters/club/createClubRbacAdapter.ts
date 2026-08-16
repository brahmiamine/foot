import type { ClubRbacReadPort } from '../../../../packages/domain-contracts/src/club-access'
import { ClubHttpClient } from '../../../../packages/club-client/src'
import { selectDomainBoundaryMode } from '../../../../packages/utils/src'
import { SharedDatabaseClubRbacAdapter } from './SharedDatabaseClubRbacAdapter'

export function createClubRbacAdapter(
  env: NodeJS.ProcessEnv = process.env,
): ClubRbacReadPort {
  const baseUrl = env.CLUB_HUB_SERVICE_URL
  const apiKey = env.CLUB_HUB_SERVICE_API_KEY
  const mode = selectDomainBoundaryMode({
    boundary: 'staff-hub->club-rbac',
    baseUrl,
    apiKey,
    requireHttp: env.DOMAIN_BOUNDARY_REQUIRE_HTTP === 'true',
  })
  if (mode === 'shared-db') return new SharedDatabaseClubRbacAdapter()
  return new ClubHttpClient({ baseUrl: baseUrl!, apiKey: apiKey! })
}
