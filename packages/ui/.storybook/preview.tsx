import type { Preview } from '@storybook/react'
import { useEffect } from 'react'
import '@foot/design-tokens/tokens.css'
import { FootGlobalStyle, FootThemeProvider } from '../src'

/**
 * Every story renders inside `FootThemeProvider` (so `theme.space` and
 * friends resolve for Stack/Grid/Spacer) plus `FootGlobalStyle` (focus-visible
 * + reduced-motion baseline), exactly like the "Development" section of
 * ../README.md recommends for a real app shell.
 *
 * Dark mode: `@foot/design-tokens/src/index.css` flips its palette under a
 * `:root.dark` selector (see that file's `:root.dark { ... }` block). The
 * `theme` toolbar global below toggles the `dark` class on
 * `document.documentElement` to match — this is the same mechanism a real
 * FOOT app uses to opt into dark mode, just driven from the Storybook
 * toolbar instead of a product setting.
 */
const withFootTheme: NonNullable<Preview['decorators']>[number] = (Story, context) => {
  const mode = context.globals.theme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  return (
    <FootThemeProvider>
      <FootGlobalStyle />
      <div
        style={{
          background: 'var(--foot-color-background)',
          color: 'var(--foot-color-text)',
          minHeight: '100%',
          padding: '1.5rem',
          fontFamily: 'var(--foot-font-ui)',
        }}
      >
        <Story />
      </div>
    </FootThemeProvider>
  )
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Actions',
          'Forms',
          'Feedback',
          'Data Display',
          'Navigation',
          'Overlay',
          'Layout',
          'Typography',
        ],
      },
    },
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Toggle FOOT light/dark tokens (:root.dark)',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        showName: true,
      },
    },
  },
  decorators: [withFootTheme],
}

export default preview
