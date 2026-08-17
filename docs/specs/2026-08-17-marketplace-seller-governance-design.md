# Marketplace seller governance design

## Goal

Make the club website the only public entry point for seller onboarding, keep `seller-portal` private, and let each club configure whether seller applications and product publication require approval.

## Ownership

- `club-ob`: public seller application form. The browser never chooses a `clubId`; the backend injects the resolved Olympique de Béja team id.
- `marketplace`: source of truth for applications, seller invitations, club marketplace settings, seller lifecycle and product approval policy.
- `club-hub`: club decisions, seller management, marketplace settings and audit.
- `seller-portal`: login, activation and seller operations only. No public registration.
- `notifications`: central email/in-app/push delivery, including email-only internal notifications for applicants who do not yet have a platform account.

## Seller onboarding

`club-ob -> SellerApplication -> club-hub review -> Seller + INVITED SellerUser -> one-time invite -> seller-portal activation`

Applications use `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`. Approval creates the seller and an invited owner in one transaction. The raw invitation token is never stored: only its SHA-256 hash is persisted. Tokens expire and are single-use.

If `sellerApprovalRequired=false`, an application is approved automatically and the invitation is sent immediately. `sellerApplicationsEnabled=false` closes the public application endpoint without re-enabling direct Seller Portal registration.

## Product policy

- `productApprovalRequired=true`: keep `DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED`.
- `productApprovalRequired=false`: seller submission publishes directly.
- `productReapprovalOnSensitiveChange=true`: changes to name, descriptions, category, brand, price or images on an approved/published item return it to `SUBMITTED`. Inventory-only changes do not.

## Security and invariants

- Service-to-service API keys stay server-side.
- Application creation is rate-limited separately from the global API throttle.
- Every admin read/write is scoped by `clubId`.
- Direct marketplace and seller-portal registration endpoints are closed.
- Seller login requires both `SellerUser.status=ACTIVE` and `Seller.status=ACTIVE`.
- Rejection reasons are mandatory.
- Club decisions and settings mutations are audited from `club-hub`.

## Validation

Marketplace unit tests cover application approval/invite and product policy. The touched projects must pass typecheck/build/lint/tests in CI before merge.
