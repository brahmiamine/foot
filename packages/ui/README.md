# @foot/ui

A standalone React design-system package for the FOOT platform. It provides 45 accessible,
TypeScript-first UI primitives built with **styled-components**, driven entirely by the
shared design tokens in `@foot/design-tokens` (`packages/design-tokens/src/index.css`).

> **Status: not wired into any app yet.** This package is developed and tested in isolation
> (`développer sans brancher dans les autres apps`). No consumer application depends on
> `@foot/ui`, and none should until a deliberate, separate integration decision is made.

## Styling approach

- Every component is written with `styled-components` v6.
- Colors, radii, shadows, fonts and spacing are never hardcoded — components read the FOOT
  CSS custom properties (`var(--foot-color-primary)`, `var(--foot-radius-md)`, …) directly,
  or via `theme.ts`, which simply wraps the same CSS variables in a typed
  styled-components theme object. `@foot/design-tokens` stays the single source of truth;
  dark mode (`:root.dark`) and any future per-portal token overrides keep working
  automatically because nothing is duplicated in JS.
- `FootThemeProvider` is a thin wrapper over styled-components' `ThemeProvider`, seeded with
  the default FOOT theme:

  ```tsx
  import { FootThemeProvider } from '@foot/ui'

  function App() {
    return (
      <FootThemeProvider>
        {/* your tree */}
      </FootThemeProvider>
    )
  }
  ```

  Components do **not** require `FootThemeProvider` to render correctly — they fall back to
  reading the CSS variables directly — but wrapping your tree in it is recommended if you
  use `theme.space` (used internally by `Stack`/`Grid`/`Spacer`) or want to override tokens
  for a one-off experiment via the optional `theme` prop.

- `FootGlobalStyle` (a styled-components `createGlobalStyle`) centralizes the visible
  `:focus-visible` outline and `prefers-reduced-motion` rules. It is optional — every
  interactive component already carries its own focus-visible and reduced-motion handling
  — but mounting it once at the root saves you from redeclaring the same baseline.
- `./styles.css` still exists for backward compatibility and re-exports the raw
  `@foot/design-tokens` token sheet plus a couple of non-visual responsive/touch-target
  safety rules. It is not required for the React components to render or theme correctly.
- Accessibility & i18n baseline applied to every component: correct ARIA roles/attributes,
  keyboard interaction where relevant, native form elements under the hood (`<input>`,
  `<button>`, …), a visible `:focus-visible` state, `prefers-reduced-motion` support, and
  logical CSS properties (`margin-inline`, `inset-inline-start`, …) instead of physical
  left/right so RTL locales (Arabic) keep working.

## Components

### Actions
- `Button` — `<Button variant="primary" size="md">Enregistrer</Button>`
- `IconButton` — `<IconButton aria-label="Supprimer" icon={<TrashIcon />} />`
- `ButtonGroup` — `<ButtonGroup attached><Button>Jour</Button><Button>Semaine</Button></ButtonGroup>`
- `Link` — `<Link href="/clubs">Voir les clubs</Link>`

### Forms
- `Input` — `<Input placeholder="Nom du club" />`
- `Textarea` — `<Textarea placeholder="Description" />`
- `Select` — `<Select options={[{ value: 'fr', label: 'France' }]} />`
- `Checkbox` — `<Checkbox label="J'accepte les conditions" />`
- `Radio` / `RadioGroup` — `<RadioGroup options={[...]} value={v} onChange={setV} />`
- `Switch` — `<Switch label="Notifications" />`
- `Slider` — `<Slider min={0} max={100} defaultValue={50} />`
- `FormField` — `<FormField label="Email" errorText="Requis"><Input /></FormField>`
- `SearchInput` — `<SearchInput value={q} onChange={...} onClear={...} />`
- `FileUpload` — `<FileUpload onFilesSelected={(files) => ...} />`

### Feedback
- `Alert` — `<Alert variant="success" title="Enregistré">Les modifications sont sauvegardées.</Alert>`
- `ToastProvider` / `useToast` — mount `<ToastProvider>` once, then `const { toast } = useToast(); toast({ title: 'Fait !' })`
- `Spinner` — `<Spinner label="Chargement…" />`
- `ProgressBar` — `<ProgressBar value={40} max={100} showValueLabel />`
- `Skeleton` — `<Skeleton variant="circular" width={40} height={40} />`
- `EmptyState` — `<EmptyState title="Aucun résultat" action={<Button>Réinitialiser</Button>} />`

### Data display
- `Badge` — `<Badge variant="success">Actif</Badge>`
- `Card` — `<Card interactive padding="lg">…</Card>`
- `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell` — a scroll-safe, sticky-header table
- `Avatar` — `<Avatar name="Amine Brahmi" src={photoUrl} />`
- `Tag` — `<Tag onRemove={() => ...}>U15</Tag>`
- `Tooltip` — `<Tooltip content="Plus d'informations"><IconButton .../></Tooltip>`
- `Stat` — `<Stat label="Licenciés actifs" value="1 240" delta="+4.2%" trend="up" />`
- `Divider` — `<Divider label="OU" />`
- `List` / `ListItem` — `<List bordered><ListItem interactive>…</ListItem></List>`

### Navigation
- `Tabs` — `<Tabs items={[{ value: 'a', label: 'Aperçu', panel: <... /> }]} />` (roving-tabindex, arrow keys)
- `Breadcrumb` — `<Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Club' }]} />`
- `Pagination` — `<Pagination page={page} pageCount={12} onPageChange={setPage} />`
- `Menu` — `<Menu trigger={<Button>Actions</Button>} items={[{ value: 'edit', label: 'Modifier', onSelect }]} />`
- `Stepper` — `<Stepper activeStep={1} steps={[{ label: 'Infos' }, { label: 'Paiement' }]} />`
- `PageHeader` — `<PageHeader title="Tableau de bord" actions={<Button>Nouveau</Button>} />`

### Overlay
- `Modal` — `<Modal open={open} onClose={close} title="Confirmer">…</Modal>` (focus trap, Escape, portal)
- `Drawer` — `<Drawer open={open} onClose={close} placement="end" title="Filtres">…</Drawer>`
- `Popover` — `<Popover trigger={<Button>Filtrer</Button>} content={<... />} />`

### Layout
- `Container` — centered, gutter-safe max-width wrapper
- `Stack` — `<Stack direction="row" gap="md" align="center">…</Stack>`
- `Grid` — `<Grid columns={3} gap="lg">…</Grid>` (or `columns="fluid"` for auto-fit)
- `Spacer` — `<Spacer size="lg" />`

### Typography
- `Heading` — `<Heading as="h1" size="xl" display>Titre</Heading>`
- `Text` — `<Text tone="muted" size="sm">Description…</Text>`

## Development

```bash
# from the repo root
pnpm install

# type-check
pnpm --filter @foot/ui typecheck

# run the test suite (vitest + Testing Library)
pnpm --filter @foot/ui test
```

Tests live next to their component (`Button.tsx` / `Button.test.tsx`) and cover a
render/props smoke test for every component, plus behavioral tests (click, keyboard,
ARIA-state assertions, disabled-state guards, Escape-to-close, focus trapping, …) for
every interactive one.

## Local preview (playground)

`playground/` is a small, self-contained Vite + React app that imports components directly
from `../src` (no build step, no dependency on the `@foot/ui` package). It is **not** a pnpm
workspace member (`pnpm-workspace.yaml` only globs `packages/*`, not
`packages/ui/playground`) and is not a dependency of any app — it exists purely to browse
the components visually while developing this package in isolation.

```bash
cd packages/ui/playground
npm install   # standalone install, deliberately outside the pnpm workspace
npm run dev   # http://localhost:4173
```

## Design tokens

All visual values come from `@foot/design-tokens`. See
`packages/design-tokens/src/index.css` for the canonical palette, typography, radius,
shadow and spacing tokens, and `packages/design-tokens/DESIGN.md` for the full contribution
contract (no new brand colors, RTL support, `prefers-reduced-motion`, visible focus states,
…).
