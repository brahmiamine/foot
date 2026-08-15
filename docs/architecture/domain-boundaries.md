# FOOT — Domain boundaries and migration pattern

## Goal

FOOT remains a monorepo with several independently deployable applications. During the migration, multiple applications may still use the same physical MariaDB instance, but a shared database no longer means shared ownership.

The architectural rule is:

> A domain owns its data and business decision. Other applications consume a typed port/API, not the owner's tables.

The migration is incremental so existing workflows can keep running while each direct shared-DB dependency is replaced.

## Standard migration pattern

Each extracted boundary follows the same shape:

```text
consumer application
        |
        v
   domain port
        |
        +--> HTTP client ----------------> owner application
        |                                     |
        |                                     v
        |                               owner service/data
        |
        +--> shared-DB adapter (temporary)
```

The shared-DB adapter is intentionally local to the consumer and exists only as a migration bridge. Application services must not import the owner's ORM entities directly.

Composition roots follow a fail-closed rule:

- both service URL and API key absent: use the shared-DB transition adapter;
- both present: use the HTTP client;
- only one present: throw a configuration error.

This prevents a partially configured deployment from silently bypassing the intended service boundary.

## Current ownership boundaries

### Identity

Owner: `identity`

Owned data/decisions:

- `User` account lifecycle;
- email uniqueness;
- password hashing;
- account activation;
- account role and account-level scopes;
- user profile fields.

Consumers use `@foot/identity-client` and contracts from `@foot/domain-contracts`:

- `IdentityDirectoryPort`;
- `IdentityAccountProvisioningPort`;
- `IdentityProfilePort`.

Already migrated consumers:

- `federation-hub` account lists/provisioning and staff invitations;
- `referee-hub` profile account data;
- `club-hub` `UserService` account lifecycle;
- `club-hub` RBAC assignee membership checks.

### Club — official match lineup

Owner: `club-hub`

Owned storage: `cms_match_lineups`.

Consumer contract: `ClubLineupReadPort`.

HTTP endpoint:

```text
GET /api/internal/matches/:matchId/lineup
GET /api/internal/matches/:matchId/lineup?teamId=:teamId
```

Consumers:

- `match-operations/LineupService`;
- `match-operations/EligibilityService`.

### Club — RBAC

Owner: `club-hub`

Owned storage:

- `cms_roles`;
- `cms_user_roles`.

Consumer contract: `ClubRbacReadPort`.

HTTP endpoint:

```text
GET /api/internal/access?teamId=:teamId&userId=:userId
```

Consumers:

- `staff-hub`;
- `medical-hub`.

The specialized hubs retain the `ADMIN => ALL` shortcut from the trusted SSO session. Non-admin effective permissions/categories come from the Club domain.

### Club — player facts needed by regulation

Owner: `club-hub`.

The Club API exposes facts, not storage details:

```ts
{
  hasActiveMembership: boolean
  hasActiveSuspension: boolean
  birthDate: string | null
}
```

Consumer contract: `ClubPlayerRegulatoryFactsPort`.

HTTP endpoint:

```text
GET /api/internal/regulatory/player-facts?playerId=:playerId&clubId=:clubId&at=:date
```

Consumer: `federation-hub/RegulatoryEligibilityService`.

Federation still owns the final regulatory interpretation such as `NO_ACTIVE_MEMBERSHIP`, `ACTIVE_SUSPENSION` and `AGE_CATEGORY_MISMATCH`. Club only provides its facts.

### Federation — regulatory eligibility

Owner: `federation-hub`.

Consumer contracts:

- `EligibilityServicePort`;
- `StaffQualificationServicePort`.

HTTP endpoints:

```text
POST /api/internal/regulatory/eligibility/player
POST /api/internal/regulatory/eligibility/head-coach
```

Consumer: `match-operations`.

Match owns the operational workflow and blocks an invalid lineup; Federation owns the regulatory decision.

### Referee availability

Owner: `referee-hub`.

Consumer contracts:

- `RefereeAvailabilityPort`;
- `RefereeAvailabilityDirectoryPort`.

HTTP endpoints:

```text
POST /api/internal/availability/check
POST /api/internal/availability/check-batch
```

Consumers:

- `match-operations` for assignment blocking;
- `federation-hub` for the official selector.

## Service authentication

Internal domain APIs use `x-api-key`. They do not depend on an end-user SSO session.

The user session still determines the actor and UI permissions at the application edge; service credentials authenticate application-to-application calls.

Do not forward an end-user JWT as a replacement for service authentication.

## Environment switches currently used

### `match-operations`

- `FEDERATION_REGULATORY_URL` + `FEDERATION_REGULATORY_SERVICE_API_KEY`;
- `REFEREE_HUB_URL` + `REFEREE_HUB_SERVICE_API_KEY`;
- `CLUB_HUB_SERVICE_URL` + `CLUB_HUB_SERVICE_API_KEY`.

### `federation-hub`

- `REFEREE_HUB_SERVICE_URL` + `REFEREE_HUB_SERVICE_API_KEY`;
- `CLUB_HUB_URL` + `CLUB_HUB_SERVICE_API_KEY`;
- `SSO_URL` + `SSO_SERVICE_API_KEY`.

### `referee-hub`

- `IDENTITY_SERVICE_URL` + `IDENTITY_SERVICE_API_KEY`.

### `club-hub`

- `IDENTITY_SERVICE_URL` + `IDENTITY_SERVICE_API_KEY`.

### `staff-hub` / `medical-hub`

- `CLUB_HUB_SERVICE_URL` + `CLUB_HUB_SERVICE_API_KEY`.

## CI enforcement

Architecture checks prevent known boundaries from drifting back toward shared-table coupling:

- `scripts/validate-architecture-boundaries.mjs`;
- `scripts/validate-club-rbac-boundaries.mjs`;
- `scripts/validate-club-player-facts-boundary.mjs`;
- `.github/workflows/ownership-boundaries.yml`.

Shared packages are also forbidden from importing TypeORM/MySQL/MariaDB/better-sqlite3. A package may contain contracts, pure rules or transport clients, but not become a hidden database gateway.

## Rules for the next extractions

Before extracting another dependency:

1. identify the logical data owner;
2. define the smallest useful fact/decision contract;
3. avoid returning database entities as API DTOs;
4. keep the business decision with its owning domain;
5. add an HTTP client and a shared-DB transition adapter only when needed;
6. add tests for both adapter selection and business behavior;
7. add a CI boundary check when the old coupling is important enough to regress easily;
8. activate HTTP by environment only after both sides are deployed;
9. remove the shared-DB adapter once every target environment uses the API.

## What this architecture is not

This migration does **not** introduce:

- Module Federation;
- runtime micro-frontends;
- one microservice per table;
- distributed transactions for every workflow.

It is a modular monorepo with explicit bounded contexts, independently deployable applications, typed synchronous APIs for critical decisions, and events/outbox reserved for asynchronous side effects.
