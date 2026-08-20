/**
 * The theme registry: each theme is a complete assignment of the surface's
 * `--dsh-st-*` custom properties, matching the fallbacks every ST panel's CSS
 * declares. Pure data plus id resolution — no DOM access lives here.
 */

/** Every custom property a theme assigns; the surface's CSS reads exactly these. */
export const THEME_VARS = [
  '--dsh-st-bg',
  '--dsh-st-fg',
  '--dsh-st-border',
  '--dsh-st-nav-bg',
  '--dsh-st-hover',
  '--dsh-st-accent',
  '--dsh-st-accent-dim',
  '--dsh-st-bubble',
  '--dsh-st-bubble-user',
] as const

/** One theme-assigned custom property name. */
export type StThemeVar = typeof THEME_VARS[number]

/** A complete theme: a label plus one color per {@link THEME_VARS}. */
export interface StTheme {
  id: string
  label: string
  vars: Record<StThemeVar, string>
}

/** The shipped themes, in panel order; `midnight` doubles as the default. */
export const THEMES: readonly StTheme[] = [
  {
    id: 'midnight',
    label: '午夜蓝',
    vars: {
      '--dsh-st-bg': '#1a1a2e',
      '--dsh-st-fg': '#e8e8f0',
      '--dsh-st-border': '#2e2e48',
      '--dsh-st-nav-bg': '#16162a',
      '--dsh-st-hover': '#26264a',
      '--dsh-st-accent': '#4a4a9c',
      '--dsh-st-accent-dim': '#37376b',
      '--dsh-st-bubble': '#23233d',
      '--dsh-st-bubble-user': '#2c2a52',
    },
  },
  {
    id: 'violet',
    label: '紫罗兰',
    vars: {
      '--dsh-st-bg': '#1e1626',
      '--dsh-st-fg': '#ece4f4',
      '--dsh-st-border': '#3a2c4a',
      '--dsh-st-nav-bg': '#181022',
      '--dsh-st-hover': '#2e2040',
      '--dsh-st-accent': '#8b5fbf',
      '--dsh-st-accent-dim': '#4d3568',
      '--dsh-st-bubble': '#261c33',
      '--dsh-st-bubble-user': '#33254a',
    },
  },
  {
    id: 'forest',
    label: '深林',
    vars: {
      '--dsh-st-bg': '#16221a',
      '--dsh-st-fg': '#e2eee6',
      '--dsh-st-border': '#2b3e30',
      '--dsh-st-nav-bg': '#111b15',
      '--dsh-st-hover': '#223428',
      '--dsh-st-accent': '#3f8f5f',
      '--dsh-st-accent-dim': '#2c5a42',
      '--dsh-st-bubble': '#1c2b21',
      '--dsh-st-bubble-user': '#24382c',
    },
  },
  {
    id: 'graphite',
    label: '石墨',
    vars: {
      '--dsh-st-bg': '#1f1f22',
      '--dsh-st-fg': '#e6e6e8',
      '--dsh-st-border': '#34343a',
      '--dsh-st-nav-bg': '#19191c',
      '--dsh-st-hover': '#2b2b30',
      '--dsh-st-accent': '#7a7a88',
      '--dsh-st-accent-dim': '#4c4c56',
      '--dsh-st-bubble': '#26262a',
      '--dsh-st-bubble-user': '#303036',
    },
  },
  {
    id: 'daylight',
    label: '日光',
    vars: {
      '--dsh-st-bg': '#f4f2ec',
      '--dsh-st-fg': '#2c2a26',
      '--dsh-st-border': '#d8d2c4',
      '--dsh-st-nav-bg': '#ebe7dd',
      '--dsh-st-hover': '#ddd7c9',
      '--dsh-st-accent': '#7d6bb8',
      '--dsh-st-accent-dim': '#c4bce0',
      '--dsh-st-bubble': '#e9e5da',
      '--dsh-st-bubble-user': '#dad2ee',
    },
  },
]

/** The default theme id; also the fallback for unknown persisted values. */
export const DEFAULT_THEME_ID = 'midnight'

/** Look up a theme by id; unknown ids fall back to {@link DEFAULT_THEME_ID}. */
export function resolveTheme(id: string): StTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!
}

/** Resolve a persisted storage value; `null` or an unknown id selects the default. */
export function resolveStoredTheme(stored: string | null): StTheme {
  return stored === null ? resolveTheme(DEFAULT_THEME_ID) : resolveTheme(stored)
}
