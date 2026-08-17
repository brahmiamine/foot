import '@testing-library/jest-dom/vitest'

// jsdom does not implement matchMedia; several components read
// `prefers-reduced-motion` / `prefers-color-scheme` via CSS only, but a
// polyfill keeps any incidental JS usage (or future hooks) test-safe.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
