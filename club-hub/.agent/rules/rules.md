---
trigger: always_on
---

###############################################################################
# Cursor Rules — TeamManager (générique multi-clubs) Next.js / TypeScript Project (2025)
# Scope: Security, Performance, Scalability, Maintainability, Reusability
###############################################################################

##################################
# 1. General Principles
##################################

- Follow Clean Code and SOLID principles at all times.
- Prefer explicit, readable, and predictable code over clever abstractions.
- Do not introduce breaking changes unless explicitly requested.
- Avoid premature optimization, but never ignore performance implications.
- Favor long-term maintainability over short-term convenience.

##################################
# 2. Language & Tooling
##################################

- TypeScript is mandatory.
- TypeScript must run with `strict: true`.
- Never use `any`; use proper types or generics.
- Avoid unsafe type assertions (`as unknown as`).
- ESLint must pass (`npm run lint`) before any commit or PR.
- Formatting must be consistent (Prettier-compatible).

##################################
# 3. Project Structure (Mandatory)
##################################

- Enforce a clear and scalable structure:
  - `src/app` → routing, layouts, pages (App Router only)
  - `src/components` → reusable UI components
  - `src/features` → domain-oriented feature modules
  - `src/hooks` → reusable React hooks
  - `src/lib` → shared utilities, helpers, clients
  - `src/services` → API/domain services
  - `src/types` → global/shared TypeScript types
  - `src/config` → runtime-safe configuration
  - `src/styles` → design tokens, themes, global styles
- No business logic inside UI components.
- No cross-feature imports unless explicitly justified.

##################################
# 4. App Router & Rendering Strategy
##################################

- Use Next.js App Router exclusively.
- Default to Server Components.
- Client Components must be explicitly marked and justified.
- Avoid unnecessary `useEffect`, `useState`, and client hydration.
- Prefer server actions for mutations when possible.
- Streaming and Suspense should be used for large or slow-loading views.

##################################
# 5. Data Fetching & Caching
##################################

- Prefer server-side data fetching.
- Configure caching explicitly:
  - `cache: 'force-cache'` or `no-store`
  - Use `revalidate` for ISR when applicable.
- Avoid client-side fetching unless strictly necessary.
- Never fetch the same data redundantly on client and server.
- Handle loading, empty, and error states explicitly.

##################################
# 6. Environment & Secrets
##################################

- Secrets must be stored only in `.env.local`.
- Never hardcode credentials, tokens, or private URLs.
- Environment variables must be validated at startup (zod recommended).
- Public env vars must be explicitly prefixed and documented.

##################################
# 7. Security (Critical)
##################################

- Validate all inputs using `zod`.
- Never trust client-side validation alone.
- Enforce authentication and authorization on all API routes.
- Apply role-based access control (RBAC) consistently.
- Protect against:
  - XSS
  - CSRF
  - Injection attacks
  - Broken access control
- Configure security headers in `next.config.ts`:
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options
  - Referrer-Policy
  - Permissions-Policy
- Never expose internal error details to clients.

##################################
# 8. API & Backend Integration
##################################

- API routes must be thin and stateless.
- Business logic must live in services.
- Errors must be typed and standardized.
- Always return consistent HTTP status codes.
- Avoid tight coupling between frontend and backend internals.
- **OpenAPI Standard & Pagination**:
  - Response structures must follow OpenAPI conventions.
  - Standardize pagination for lists using `limit`, `page`, `total`, and `totalPages` in the response metadata.
  - Use DTOs for request/response validation.

##################################
# 9. Database & ORM (TypeORM)
##################################

- **TypeORM is Mandatory** for all database interactions.
- Use **Entities** to define database schema.
- **No Raw SQL in Components**:  
  - Database logic must be encapsulated in the Service Layer/Repositories.
  - UI components must never execute SQL queries directly.
- Migrations:
  - Use TypeORM migrations for schema changes.
  - Don't use `synchronize: true` in production.

##################################
# 10. UI, Design System & Accessibility
##################################

- Components must be reusable and composable.
- No duplicated UI logic across components.
- Prefer controlled components.
- Enforce accessibility (WCAG):
  - Semantic HTML
  - Keyboard navigation
  - ARIA attributes when needed
- Avoid inline styles.
- Design tokens and themes must be centralized.
- **Responsiveness (Critical)**:
  - Design must be fully responsive: Mobile < Tablet < Desktop.
  - Use Bootstrap 5 breakpoints (`d-md-block`, `col-lg-4`, etc.).
  - Test on multiple viewports.
- **Theming (Dark & Light Mode)**:
  - Strict adherence to CSS variables for colors to support switching modes.
  - Ensure contrast ratios are valid in both modes.
- **Global State Management**:
  - Use React Context API for global UI state (e.g., theme, sidebar status, toasts).
  - Avoid complex state libraries (Redux/Zustand) unless absolutely necessary.
- **Design Consistency (Mandatory)**:
  - Maintain strict visual consistency across ALL pages.
  - Reuse identical tokens (colors, spacing, typography) and components everywhere.
  - Do not create ad-hoc designs that deviate from the design system.

##################################
# 11. Assets, Fonts & Scripts
##################################

- All static assets must be served from `public/`.
- Use `next/image` for images whenever possible.
- Fonts must use `next/font` or be self-hosted.
- Third-party scripts must use `next/script` with a proper strategy:
  - `beforeInteractive`
  - `afterInteractive`
  - `lazyOnload`
- Avoid blocking the main thread.
- Bootstrap: préférer l’installation via pnpm/npm (import CSS/JS bundlé) plutôt que CDN en production; ne pas mélanger CDN et bundle local sur une même page.

##################################
# 12. Template & Design System Integration
##################################

## Template Components & Bootstrap 5 Usage

- ALWAYS prioritize using components from `template/` folder before creating new ones.
- ALWAYS use Bootstrap 5 components 
- When creating new components, base them on existing template patterns:
  - Extract reusable sections from `template/*.html` files
  - Convert HTML templates to React/Next.js Server Components when possible
  - Maintain the same HTML structure and class names from templates
- For admin/dashboard pages, use patterns from Boostrap5

## Color Palette (MANDATORY)

- ALWAYS use CSS variables from `template/css/custom.css`:
  ```css
  --primary-color: #031521;      /* Dark blue/black - main brand */
  --accent-color: #C42221;       /* Red - CTAs, highlights */
  --text-color: #999999;         /* Gray - body text */
  --white-color: #FFFFFF;        /* White - backgrounds */
  --secondary-color: #FFFFFF1A;   /* White transparent - overlays */
  --divider-color: #0315211A;    /* Primary transparent - borders */
  --dark-divider-color: #FFFFFF1A; /* White transparent - dark sections */
  --error-color: rgb(230, 87, 87); /* Light red - errors */
  ```
- NEVER hardcode colors. Always use CSS variables.
- Support **Dark/Light Mode** by updating these variables in the root/theme provider, not by changing class names manually.

## Typography

- Use fonts from template:
  - Default font: `"Manrope", sans-serif` (var(--default-font))
  - Accent/Headings: `"Bebas Neue", sans-serif` (var(--accent-font))
- Headings (h1-h6) must use `var(--accent-font)` and `var(--primary-color)`.
- Body text must use `var(--default-font)` and `var(--text-color)`.

## Component Reusability

- Extract common patterns from templates:
  - Header/Footer → `src/components/layout/`
  - Hero sections → `src/components/sections/`
  - Cards, buttons, forms → `src/components/ui/`
- When adapting template HTML to React:
  - Keep original class names
  - Convert static content to props/data
  - Maintain semantic HTML structure
  - Use Next.js Image component for images

## Bootstrap 5 Integration & Client Components

- Use Bootstrap 5 classes for layout (grid, spacing, utilities).
- Override Bootstrap colors with template CSS variables.
- **Client Component Isolation**:
  - Bootstrap interactive components (Modals, Dropdowns, Tooltips) require `use client`.
  - **Do NOT** make the entire page `use client`.
  - Encapsulate these elements in small, isolated components (e.g., `<BootstrapModal>`, `<DropdownMenu>`).
  - Import these client wrappers into your Server Component pages.
- Combine template custom CSS with Bootstrap utilities.
- Never mix CDN Bootstrap with npm Bootstrap on the same page.

## Dark Sections

- Template uses `.dark-section` class for dark backgrounds.
- Dark sections use:
  - Background: `var(--primary-color)` or gradient
  - Text: `var(--white-color)`
  - Borders: `var(--dark-divider-color)`
- Always apply `.dark-section` when adapting dark sections from templates.

##################################
# 13. Internationalization (i18n)
##################################

- **Translation First**:
  - The app must support i18n from the start (e.g., `next-intl` or similar).
  - No hardcoded usage of text strings in UI components. Use keys.
  - Support easy switching between languages (FR/AR/EN).
- Store translations in structured JSON files.

##################################
# 18. SEO & Public Public Facing
##################################

- **SEO Focus**:
  - Prioritize SEO optimization ONLY for:
    - Landing Page
    - Public User Space
    - News/Blog sections
  - Admin dashboards and private user areas do NOT require deep SEO optimization.
- **Metadata**:
  - Use Next.js `generateMetadata` for dynamic pages.
  - Ensure OpenGraph (OG) tags are present for all public shareable pages.

##################################
# 14. Performance Optimization
##################################

- Minimize bundle size.
- Avoid unnecessary dependencies.
- Prefer dynamic imports for heavy modules.
- Analyze bundles regularly (`next build --analyze`).
- Optimize images, fonts, and scripts.
- Prevent layout shifts (CLS).
- Avoid unnecessary re-renders.

##################################
# 15. Dependency Management
##################################

- Avoid unnecessary dependencies.
- No dependency added without justification.
- Keep dependencies up to date and audited.
- Prefer well-maintained and widely adopted libraries.

##################################
# 16. Documentation & Readability
##################################

- Public functions and services must be documented with JSDOC complet
- Complex logic must be explained.
- Naming must be explicit and domain-driven.
- Comments must explain “why”, not “what”.

##################################
# 17. Explicit DO NOT Rules
##################################

- Do not weaken security for convenience.
- Do not bypass validation or authorization.
- Do not introduce client-side state when server-side is sufficient.
- Do not mix UI, business, and infrastructure logic.
- Do not ship untested critical paths.
- Do not leak secrets or internal details.
- **NO Unit Tests**: 
  - Do not write unit tests (focus on feature delivery and speed).
  - Rely on manual testing and TypeScript for type safety.
- **NO Production Logs**:
  - Do not leave `console.log` or debug traces in the final code.
  - Remove all logging before merging.
