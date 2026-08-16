# Match Operations Role Access Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `match-operations` SSO-first and expose only the matches/actions that belong to the authenticated centre referee or an authorised club representative/coach.

**Architecture:** Keep Identity as the authentication source and Club Hub as the owner of club RBAC. `match-operations` reads the existing `cms_roles` / `cms_user_roles` projection to resolve the two new permissions without moving role ownership, and validates every match/signature server-side. Centre-referee access is derived from an ACTIVE `CENTER_REFEREE` assignment, never from the JWT role alone.

**Tech Stack:** Next.js 16, React 19, TypeScript, TypeORM, MariaDB, Vitest, shared RS256 SSO.

## Global Constraints

- `/` in `match-operations` requires SSO.
- A centre referee sees only matches with an ACTIVE `CENTER_REFEREE` assignment for their SSO user.
- A club account sees only matches involving its `teamId` and, for scoped staff roles, only the assigned age categories.
- Club access and signing are controlled by `matchOperations.access` and `matchOperations.sign` configured in Club Hub roles.
- `ADMIN` / `CLUB_ADMIN` retain the Club Hub convention of full club access.
- A user may only record the signature actor role that corresponds to their authenticated match relationship: home club, away club, or centre referee.
- All enforcement is server-side; UI filtering is not an authorization boundary.
- Existing federation/league/platform administrators remain outside direct `match-operations` sessions.

---

### Task 1: Add Club Hub match-sheet permissions

**Files:**
- Modify: `club-hub/src/lib/permissions.ts`

**Interfaces:**
- Consumes: `PERMISSION_MODULES`, `DEFAULT_ROLE_PRESETS`
- Produces: `matchOperations.access`, `matchOperations.sign`

- [ ] Add a `matchOperations` permission module rendered automatically by Roles Management.
- [ ] Include both permissions in the Coach preset for newly bootstrapped clubs; existing roles remain explicitly editable and are not silently backfilled.
- [ ] Verify Club Hub typecheck/lint/tests/build.

### Task 2: Resolve effective match access in Match Operations

**Files:**
- Create: `match-operations/src/services/MatchAccessService.ts`
- Create: `match-operations/src/services/MatchAccessService.test.ts`
- Modify: `match-operations/src/services/MatchService.ts`
- Modify: `match-operations/src/services/MatchOfficialAssignmentService.ts`

**Interfaces:**
- Consumes: SSO `{ userId, role, teamId }`, `cms_roles`, `cms_user_roles`, `match_official_assignments`
- Produces: `resolveActorAccess()`, `listAccessibleMatches()`, `assertMatchAccess()`, `assertSignatureActor()`

- [ ] Test that CLUB_STAFF without `matchOperations.access` is denied.
- [ ] Test that a scoped club role is limited to its configured age category.
- [ ] Test that CLUB_ADMIN gets full club access.
- [ ] Test that REFEREE requires an ACTIVE `CENTER_REFEREE` assignment and assistants/delegates are excluded.
- [ ] Implement the minimum read-only RBAC projection and match queries.
- [ ] Verify focused tests then the Match Operations suite.

### Task 3: Make SSO and match navigation personal

**Files:**
- Modify: `match-operations/src/lib/ssoSession.ts`
- Modify: `match-operations/src/middleware.ts`
- Modify: `match-operations/src/app/layout.tsx`
- Modify: `match-operations/src/app/[matchId]/layout.tsx`
- Modify: `match-operations/src/app/page.tsx`
- Modify: `match-operations/src/lib/i18n/dictionaries.ts`

**Interfaces:**
- Consumes: verified SSO session + `MatchAccessService`
- Produces: protected root, scoped bottom navigation, `Mes matchs` landing state

- [ ] Stop treating `/` as public; redirect unauthenticated users to Identity login.
- [ ] Permit only normalised club accounts and REFEREE sessions through middleware.
- [ ] Populate the match list from `listAccessibleMatches()` rather than global recent matches.
- [ ] Re-check the selected match with `assertMatchAccess()` in `[matchId]/layout.tsx`.
- [ ] Add FR/AR copy for the personal match selection/empty/denied states.
- [ ] Verify i18n parity, typecheck, lint, tests and production build.

### Task 4: Bind signatures to the authenticated actor

**Files:**
- Modify: `match-operations/src/app/[matchId]/pre-match/actions.ts`
- Modify: `match-operations/src/app/[matchId]/post-match/actions.ts`
- Add/update focused action/access tests under `match-operations/src/app/[matchId]` or `match-operations/src/services`

**Interfaces:**
- Consumes: requested `actorRole`, sheet `matchId`, SSO headers, `MatchAccessService.assertSignatureActor()`
- Produces: server-enforced own-role signatures

- [ ] Reject a home-club user attempting `TEAM_AWAY` or `REFEREE`.
- [ ] Reject a club user without `matchOperations.sign`, even if they can view the match.
- [ ] Reject a REFEREE who is not the active centre referee for that match.
- [ ] Allow the authorised home/away representative and active centre referee to sign their own actor role.
- [ ] Apply the same enforcement to pre-match and post-match signature actions.
- [ ] Run Match Operations gates and repository CI through the PR.

## Unresolved Product Decisions

None. The approved implementation uses category-scoped club roles and keeps Club Hub administrators as full-access accounts, matching the existing Club Hub RBAC convention.
