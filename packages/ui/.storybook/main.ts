import type { StorybookConfig } from '@storybook/react-vite'

// @foot/ui is developed and previewed in isolation (see ../README.md). This
// Storybook lives entirely inside `packages/ui/.storybook` — it is not a
// pnpm workspace member (`pnpm-workspace.yaml` only globs `packages/*`, not
// nested folders under a package) and no consumer app depends on it.
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-links'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  viteFinal: async (viteConfig) => {
    // Storybook resolves `react`/`react-dom` from `packages/ui`'s own
    // node_modules. Without an explicit dedupe, Vite can end up resolving a
    // second copy through a peer's node_modules in the pnpm workspace,
    // producing "invalid hook call" errors the moment a component uses
    // hooks (Tabs, Modal, Menu, ...). Mirrors the fix already applied in
    // `packages/ui/playground/vite.config.ts`.
    viteConfig.resolve = viteConfig.resolve ?? {}
    viteConfig.resolve.dedupe = [
      ...(viteConfig.resolve.dedupe ?? []),
      'react',
      'react-dom',
      'styled-components',
    ]
    return viteConfig
  },
  docs: {
    defaultName: 'Docs',
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
}

export default config
