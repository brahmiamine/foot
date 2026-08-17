import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useContext } from 'react'
import { ThemeContext } from 'styled-components'
import { FootThemeProvider, footTheme } from './theme'

function ThemeReader() {
  const theme = useContext(ThemeContext)
  return <span data-testid="primary">{theme?.colors.primary}</span>
}

describe('FootThemeProvider', () => {
  it('provides the default FOOT theme to descendants', () => {
    render(
      <FootThemeProvider>
        <ThemeReader />
      </FootThemeProvider>,
    )
    expect(screen.getByTestId('primary')).toHaveTextContent('var(--foot-color-primary)')
  })

  it('merges a partial theme override on top of the defaults', () => {
    render(
      <FootThemeProvider theme={{ colors: { ...footTheme.colors, primary: '#123456' } }}>
        <ThemeReader />
      </FootThemeProvider>,
    )
    expect(screen.getByTestId('primary')).toHaveTextContent('#123456')
  })
})
