/**
 * Theme registry tests: every theme assigns every surface variable, and id
 * resolution falls back to the default for unknown or missing stored values.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME_ID, THEMES, THEME_VARS, resolveStoredTheme, resolveTheme } from '../src/client/themes.ts'

describe('theme registry', () => {
  it('assigns every surface variable in every theme', () => {
    for (const theme of THEMES) {
      for (const name of THEME_VARS) {
        expect(theme.vars[name], `${theme.id} misses ${name}`).toMatch(/^#/)
      }
    }
  })

  it('resolves a known id to its own theme', () => {
    expect(resolveTheme('violet').id).toBe('violet')
  })

  it('falls back to the default theme for unknown ids', () => {
    expect(resolveTheme('no-such-theme').id).toBe(DEFAULT_THEME_ID)
  })

  it('resolves a null stored value to the default theme', () => {
    expect(resolveStoredTheme(null).id).toBe(DEFAULT_THEME_ID)
  })
})
